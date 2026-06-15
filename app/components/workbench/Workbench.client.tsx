import { useStore } from '@nanostores/react';
import { motion, type HTMLMotionProps, type Variants } from 'framer-motion';
import { computed } from 'nanostores';
import { memo, useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import {
  type OnChangeCallback as OnEditorChange,
  type OnScrollCallback as OnEditorScroll,
} from '~/components/editor/codemirror/CodeMirrorEditor';
import { workbenchStore, type WorkbenchViewType } from '~/lib/stores/workbench';
import { classNames } from '~/utils/classNames';
import { cubicEasingFn } from '~/utils/easings';
import { renderLogger } from '~/utils/logger';
import { EditorPanel } from './EditorPanel';
import { Preview } from './Preview';

interface WorkspaceProps {
  chatStarted?: boolean;
  isStreaming?: boolean;
}

const viewTransition = { ease: cubicEasingFn };

const workbenchVariants = {
  closed: {
    width: 0,
    transition: {
      duration: 0.2,
      ease: cubicEasingFn,
    },
  },
  open: {
    width: 'var(--workbench-width)',
    transition: {
      duration: 0.2,
      ease: cubicEasingFn,
    },
  },
} satisfies Variants;

export const Workbench = memo(({ chatStarted, isStreaming }: WorkspaceProps) => {
  renderLogger.trace('Workbench');

  const hasPreview = useStore(computed(workbenchStore.previews, (previews) => previews.length > 0));
  const showWorkbench = useStore(workbenchStore.showWorkbench);
  const selectedFile = useStore(workbenchStore.selectedFile);
  const currentDocument = useStore(workbenchStore.currentDocument);
  const unsavedFiles = useStore(workbenchStore.unsavedFiles);
  const files = useStore(workbenchStore.files);
  const selectedView = useStore(workbenchStore.currentView);
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  const setSelectedView = (view: WorkbenchViewType) => {
    workbenchStore.currentView.set(view);
  };

  useEffect(() => {
    if (hasPreview) {
      setSelectedView('preview');
    }
  }, [hasPreview]);

  useEffect(() => {
    workbenchStore.setDocuments(files);
  }, [files]);

  const onEditorChange = useCallback<OnEditorChange>((update) => {
    workbenchStore.setCurrentDocumentContent(update.content);
  }, []);

  const onEditorScroll = useCallback<OnEditorScroll>((position) => {
    workbenchStore.setCurrentDocumentScrollPosition(position);
  }, []);

  const onFileSelect = useCallback((filePath: string | undefined) => {
    workbenchStore.setSelectedFile(filePath);
  }, []);

  const onFileSave = useCallback(() => {
    workbenchStore.saveCurrentDocument().catch(() => {
      toast.error('Failed to update file content');
    });
  }, []);

  const onFileReset = useCallback(() => {
    workbenchStore.resetCurrentDocument();
  }, []);

  const downloadCurrentFile = useCallback(() => {
    if (!currentDocument) {
      toast.info('Open a file first');
      return;
    }

    const blob = new Blob([currentDocument.value], { type: 'text/plain;charset=utf-8' });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = objectUrl;
    link.download = currentDocument.filePath.split('/').pop() || 'workspace-file.txt';
    link.click();

    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  }, [currentDocument]);

  return (
    chatStarted && (
      <motion.div
        initial="closed"
        animate={showWorkbench ? 'open' : 'closed'}
        variants={workbenchVariants}
        className="z-workbench"
      >
        <div
          className={classNames(
            'fixed top-[var(--header-height)] bottom-0 w-[var(--workbench-inner-width)] z-20 transition-[left,width] duration-200 bolt-ease-cubic-bezier',
            {
              'left-[var(--workbench-left)]': showWorkbench,
              'left-[100%]': !showWorkbench,
            },
          )}
        >
          <div className="absolute inset-0 flex flex-col bg-[#0d0d0f] border-l border-white/10 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] overflow-hidden">
            {/* Simplified Header - Main controls are in the top Header */}
            <div className="flex h-10 items-center gap-3 border-b border-white/5 px-4 bg-[#131315]">
              <div className="flex items-center gap-2 text-[11px] text-white/50">
                <span className="font-medium">{selectedView === 'code' ? 'Code Editor' : 'Preview'}</span>
              </div>
              <div className="ml-auto flex items-center gap-2">
                {selectedView === 'code' ? (
                  <>
                    <button
                      className="inline-flex items-center gap-1.5 rounded border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white/60 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                      onClick={() => {
                        workbenchStore.toggleTerminal(!workbenchStore.showTerminal.get());
                      }}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Terminal
                    </button>
                  </>
                ) : (
                  <div className="flex items-center space-x-1 bg-white/5 p-0.5 rounded-full border border-white/10">
                    <button
                      className={classNames(
                        'flex items-center space-x-1 px-2.5 py-0.5 text-[10px] font-medium rounded-full transition-all cursor-pointer',
                        deviceMode === 'desktop'
                          ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                          : 'bg-transparent text-gray-400 hover:text-white border border-transparent'
                      )}
                      onClick={() => setDeviceMode('desktop')}
                    >
                      <div className="i-ph:monitor text-xs shrink-0" />
                      <span>Desktop</span>
                    </button>
                    <button
                      className={classNames(
                        'flex items-center space-x-1 px-2.5 py-0.5 text-[10px] font-medium rounded-full transition-all cursor-pointer',
                        deviceMode === 'tablet'
                          ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                          : 'bg-transparent text-gray-400 hover:text-white border border-transparent'
                      )}
                      onClick={() => setDeviceMode('tablet')}
                    >
                      <div className="i-ph:tablet text-xs shrink-0" />
                      <span>Tablet</span>
                    </button>
                    <button
                      className={classNames(
                        'flex items-center space-x-1 px-2.5 py-0.5 text-[10px] font-medium rounded-full transition-all cursor-pointer',
                        deviceMode === 'mobile'
                          ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                          : 'bg-transparent text-gray-400 hover:text-white border border-transparent'
                      )}
                      onClick={() => setDeviceMode('mobile')}
                    >
                      <div className="i-ph:device-mobile text-xs shrink-0" />
                      <span>Mobile</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="relative flex-1 overflow-hidden">
              <View
                initial={{ x: selectedView === 'code' ? 0 : '-100%' }}
                animate={{ x: selectedView === 'code' ? 0 : '-100%' }}
              >
                <EditorPanel
                  editorDocument={currentDocument}
                  isStreaming={isStreaming}
                  selectedFile={selectedFile}
                  files={files}
                  unsavedFiles={unsavedFiles}
                  onFileSelect={onFileSelect}
                  onEditorScroll={onEditorScroll}
                  onEditorChange={onEditorChange}
                  onFileSave={onFileSave}
                  onFileReset={onFileReset}
                />
              </View>
              <View
                initial={{ x: selectedView === 'preview' ? 0 : '100%' }}
                animate={{ x: selectedView === 'preview' ? 0 : '100%' }}
              >
                <Preview deviceMode={deviceMode} />
              </View>
            </div>
          </div>
        </div>
      </motion.div>
    )
  );
});

interface ViewProps extends HTMLMotionProps<'div'> {
  children: JSX.Element;
}

const View = memo(({ children, ...props }: ViewProps) => {
  return (
    <motion.div className="absolute inset-0" transition={viewTransition} {...props}>
      {children}
    </motion.div>
  );
});
