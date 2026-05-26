import { streamText, Output, type ModelMessage } from 'ai'
import { getModelOptions } from '@/ai/gateway'
import { Models } from '@/ai/constants'
import { Deferred } from '@/lib/deferred'
import z from 'zod'

export type File = z.infer<typeof fileSchema>

const fileSchema = z.object({
  path: z
    .string()
    .describe(
      "Path to the file in the Vercel Sandbox (relative paths from sandbox root, e.g., 'src/main.js', 'package.json', 'components/Button.tsx')"
    ),
  content: z
    .string()
    .describe(
      'The content of the file as a utf8 string (complete file contents that will replace any existing file at this path)'
    ),
})

interface Params {
  messages: ModelMessage[]
  modelId: string
  paths: string[]
}

interface FileContentChunk {
  files: z.infer<typeof fileSchema>[]
  paths: string[]
  written: string[]
}

export async function* getContents(
  params: Params
): AsyncGenerator<FileContentChunk> {
  const fallbackOrder: string[] = []
  if (params.modelId === Models.FreeModelGPT) {
    fallbackOrder.push(Models.NvidiaMistral, Models.GroqLlama)
  } else if (params.modelId === Models.GroqLlama) {
    fallbackOrder.push(Models.FreeModelGPT, Models.NvidiaMistral)
  } else {
    fallbackOrder.push(Models.FreeModelGPT, Models.GroqLlama)
  }
  const modelsToTry = [params.modelId, ...fallbackOrder]

  let lastError: unknown

  for (const modelId of modelsToTry) {
    const allPaths = new Set<string>()
    const deferred = new Deferred<void>()

    try {
      const result = streamText({
        ...getModelOptions(modelId, { reasoningEffort: 'low' }),
        maxOutputTokens: 64000,
        system:
          'You are a file content generator. You must generate files based on the conversation history and the provided paths. NEVER generate lock files (pnpm-lock.yaml, package-lock.json, yarn.lock) - these are automatically created by package managers.',
        messages: [
          ...params.messages,
          {
            role: 'user',
            content: `Generate the content of the following files according to the conversation: ${params.paths.map(
              (path) => `\n - ${path}`
            )}`,
          },
        ],
        output: Output.object({ schema: z.object({ files: z.array(fileSchema) }) }),
        onError: (error) => {
          deferred.reject(error)
          console.error(`Error communicating with AI (${modelId})`)
          console.error(JSON.stringify(error, null, 2))
        },
      })

      // Phase 1: Stream only paths for UI progress — no file content yet
      for await (const items of result.partialOutputStream) {
        if (!Array.isArray(items?.files)) {
          continue
        }

        const validFiles = items.files.filter(
          (file): file is z.infer<typeof fileSchema> =>
            fileSchema.safeParse(file).success
        )

        for (const file of validFiles) {
          allPaths.add(file.path)
        }

        // Yield paths for UI progress, but no file content (avoids writing partial content)
        yield { files: [], paths: Array.from(allPaths), written: [] }
      }

      // Phase 2: Wait for the final complete output
      const raceResult = await Promise.race([result.output, deferred.promise])
      if (!raceResult) {
        throw new Error('Unexpected Error: Deferred was resolved before the result')
      }

      const finalFiles = (raceResult.files ?? []).filter(
        (file): file is z.infer<typeof fileSchema> =>
          fileSchema.safeParse(file).success
      )

      if (finalFiles.length === 0) {
        throw new Error('No valid files generated in the final output')
      }

      // Yield the complete files once — sandbox only ever sees complete content
      yield {
        files: finalFiles,
        paths: Array.from(allPaths),
        written: [],
      }

      // Success — exit the fallback loop
      return
    } catch (error) {
      lastError = error
      if (allPaths.size > 0) {
        // If we already yielded paths, we cannot cleanly fall back to another model.
        throw error
      }
      console.warn(`Model ${modelId} failed in getContents. Attempting fallback...`)
      // Wait a moment before retrying
      await new Promise((resolve) => setTimeout(resolve, 1500))
    }
  }

  throw lastError
}
