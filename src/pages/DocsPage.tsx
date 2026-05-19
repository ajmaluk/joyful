import { Code2, Download, FileText, Monitor, ShieldCheck, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const steps = [
  { icon: Sparkles, title: 'Describe the site', body: 'Use the assistant to generate a first version from a clear product brief.' },
  { icon: Code2, title: 'Edit files locally', body: 'Open HTML, CSS, and JavaScript files in the built-in editor.' },
  { icon: Monitor, title: 'Preview safely', body: 'Render the site inside the browser sandbox with desktop, tablet, and mobile modes.' },
  { icon: Download, title: 'Export ZIP', body: 'Download the static project and deploy it wherever you like.' },
];

export function DocsPage() {
  const navigate = useNavigate();

  return (
    <div className="h-full overflow-y-auto bg-gray-50 p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 max-w-2xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-md border border-gray-300 bg-gray-100 px-3 py-1.5 text-xs text-gray-700">
            <FileText className="h-3.5 w-3.5 text-indigo-600" />
            Documentation
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900">Build locally, preview safely, export cleanly.</h1>
          <p className="mt-3 text-sm leading-relaxed text-gray-600">
            Joyful is a free local-first website builder. Use it to generate static pages, edit source files,
            test responsive previews, and export a deployable ZIP.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="rounded-xl border border-gray-300 bg-gray-100 p-4">
                <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-md bg-gray-100 text-indigo-600">
                  <Icon className="h-4 w-4" />
                </div>
                <h2 className="text-sm font-medium text-gray-900">{step.title}</h2>
                <p className="mt-2 text-xs leading-relaxed text-gray-600">{step.body}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-xl border border-gray-300 bg-gray-100 p-5">
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[#66D28E]" />
              <h2 className="text-sm font-medium text-gray-900">Free mode guarantees</h2>
            </div>
            <ul className="space-y-2 text-xs leading-relaxed text-gray-600">
              <li>No paid E2B sandbox dependency.</li>
              <li>No required OpenAI, Anthropic, or OpenRouter API key.</li>
              <li>Projects are stored in browser local storage.</li>
              <li>Exported projects are plain static files.</li>
            </ul>
          </section>

          <section className="rounded-xl border border-gray-300 bg-gray-100 p-5">
            <h2 className="text-sm font-medium text-gray-900">Recommended prompt</h2>
            <div className="mt-3 rounded-lg border border-gray-300 bg-gray-50 p-4 font-mono text-xs leading-relaxed text-gray-700">
              Create a clean SaaS homepage for a free local-first AI website builder. Include hero, features,
              workflow, pricing-free section, FAQ, SEO metadata, and responsive mobile layout.
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="mt-4 rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 transition-colors hover:bg-white dark:bg-[#1c1c21] dark:text-white dark:hover:bg-[#27272d]"
            >
              Open dashboard
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
