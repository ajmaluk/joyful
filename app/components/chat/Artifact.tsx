import { useStore } from '@nanostores/react';
import { AnimatePresence, motion } from 'framer-motion';
import { computed } from 'nanostores';
import { memo, useEffect, useRef, useState } from 'react';
import { createHighlighter, type BundledLanguage, type BundledTheme, type HighlighterGeneric } from 'shiki';
import type { ActionState } from '~/lib/runtime/action-runner';
import { workbenchStore } from '~/lib/stores/workbench';
import { classNames } from '~/utils/classNames';
import { cubicEasingFn } from '~/utils/easings';

const highlighterOptions = {
  langs: ['shell'],
  themes: ['light-plus', 'dark-plus'],
};

const shellHighlighter: HighlighterGeneric<BundledLanguage, BundledTheme> =
  import.meta.hot?.data.shellHighlighter ?? (await createHighlighter(highlighterOptions));

if (import.meta.hot) {
  import.meta.hot.data.shellHighlighter = shellHighlighter;
}

interface ArtifactProps {
  messageId: string;
}

export const Artifact = memo(({ messageId }: ArtifactProps) => {
  const userToggledActions = useRef(false);
  const [showActions, setShowActions] = useState(false);
  const [showAllActions, setShowAllActions] = useState(false);

  const artifacts = useStore(workbenchStore.artifacts);
  const artifact = artifacts[messageId];

  const actions = useStore(
    computed(workbenchStore.artifacts, (arts) => {
      const art = arts[messageId];
      return art ? Object.values(art.runner.actions.get()) : [];
    }),
  );

  useEffect(() => {
    if (actions.length && !showActions && !userToggledActions.current) {
      setShowActions(true);
    }
  }, [actions, showActions]);

  if (!artifact) {
    return null;
  }

  const toggleActions = () => {
    userToggledActions.current = true;
    setShowActions(!showActions);
  };

  const totalActions = actions.length;
  const completedActions = actions.filter((a) => a.status === 'complete').length;
  const failedActions = actions.filter((a) => a.status === 'failed').length;
  const isRunning = actions.some((a) => a.status === 'running');

  return (
    <div className="artifact w-full max-w-full mr-auto overflow-hidden rounded-2xl border border-white/10 bg-[#202023] shadow-md transition-all duration-200">
      {/* Accordion Header */}
      <div
        className="flex items-center justify-between py-2 px-3 cursor-pointer hover:bg-white/5 transition-colors border-b border-white/5"
        onClick={toggleActions}
      >
        <div className="flex items-center min-w-0 flex-1 mr-2">
          <div className="min-w-0 flex-1">
            <h3
              style={{ fontSize: '12px', margin: 0 }}
              className="font-semibold text-white truncate whitespace-nowrap overflow-hidden leading-tight"
            >
              {artifact.title}
            </h3>
            <div className="flex items-center space-x-1.5 mt-1.5">
              <span className="text-[8px] text-white/50 leading-none">
                {isRunning ? 'Building...' : 'Click to view actions'}
              </span>
              <span className="text-[8px] px-1 py-0.5 rounded-full bg-white/10 text-white/70 leading-none">
                {completedActions}/{totalActions}
              </span>
              {failedActions > 0 && (
                <span className="text-[8px] px-1 py-0.5 rounded-full bg-red-500/20 text-red-400 leading-none">
                  {failedActions}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className={classNames('transition-transform duration-200 shrink-0', showActions ? 'rotate-180' : '')}>
          <svg className="w-2.5 h-2.5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Accordion Content */}
      <AnimatePresence>
        {showActions && actions.length > 0 && (
          <motion.div
            className="actions"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <div className="p-2.5 space-y-2">
              <div
                className={classNames(
                  'overflow-y-auto pr-1 space-y-2 transition-all duration-200',
                  showAllActions ? 'max-h-[500px]' : 'max-h-[160px]',
                )}
              >
                <ActionList actions={actions} />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end pt-1.5 border-t border-white/5">
                {actions.length > 5 && (
                  <button
                    onClick={() => setShowAllActions(!showAllActions)}
                    className="py-1 px-2.5 text-[10px] font-medium border border-white/20 rounded-md hover:bg-white/10 text-white transition-colors bg-transparent cursor-pointer shrink-0"
                  >
                    {showAllActions ? 'Show Less' : 'Show All'}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

interface ShellCodeBlockProps {
  className?: string;
  code: string;
}

function ShellCodeBlock({ className, code }: ShellCodeBlockProps) {
  return (
    <div
      className={classNames(
        'text-xs font-mono bg-black/30 rounded-lg p-2 border border-white/5 overflow-x-auto',
        className,
      )}
      dangerouslySetInnerHTML={{
        __html: shellHighlighter.codeToHtml(code, {
          lang: 'shell',
          theme: 'dark-plus',
        }),
      }}
    ></div>
  );
}

interface ActionListProps {
  actions: ActionState[];
}

const actionVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

function getStatusIcon(status: ActionState['status']) {
  switch (status) {
    case 'running':
      return <div className="i-svg-spinners:90-ring-with-bg text-blue-400"></div>;
    case 'pending':
      return <div className="i-ph:circle-duotone text-white/30"></div>;
    case 'complete':
      return <div className="i-ph:check text-green-500 font-bold"></div>;
    case 'failed':
      return <div className="i-ph:x text-red-500 font-bold"></div>;
    case 'aborted':
      return <div className="i-ph:minus-circle text-white/30"></div>;
    default:
      return null;
  }
}

const ActionItem = memo(({ action, isLast }: { action: ActionState; isLast: boolean }) => {
  const [isExpanded, setIsExpanded] = useState(action.status === 'running' || action.status === 'failed');

  useEffect(() => {
    if (action.status === 'running' || action.status === 'failed') {
      setIsExpanded(true);
    }
  }, [action.status]);

  return (
    <motion.li
      variants={actionVariants}
      initial="hidden"
      animate="visible"
      transition={{
        duration: 0.2,
        ease: cubicEasingFn,
      }}
    >
      <div className="flex items-center space-x-3 text-[13px]">
        <div className="text-base shrink-0 flex items-center">{getStatusIcon(action.status)}</div>
        {action.type === 'file' ? (
          <div className="text-white/70 min-w-0 flex-1 break-all py-0.5">
            {action.filePath.includes('/') ? 'Edit' : 'Create'}{' '}
            <code className="bg-white/5 px-1.5 py-0.5 rounded text-white/90 font-mono text-[11px] break-all inline-block max-w-full">
              {action.filePath}
            </code>
          </div>
        ) : action.type === 'shell' ? (
          <div
            className="flex items-center w-full text-white/70 min-w-0 cursor-pointer select-none gap-2 hover:text-white py-0.5"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <span className="font-medium shrink-0">Run:</span>
            <code className="bg-white/5 px-1.5 py-0.5 rounded text-white/90 font-mono text-[11px] break-all truncate flex-1 max-w-[calc(100%-40px)]">
              {action.content}
            </code>
            <div
              className={classNames(
                'transition-transform duration-200 shrink-0 ml-auto mr-1',
                isExpanded ? 'rotate-180' : '',
              )}
            >
              <svg className="w-2.5 h-2.5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        ) : null}
      </div>
      <AnimatePresence initial={false}>
        {action.type === 'shell' && isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15, ease: cubicEasingFn }}
            className="overflow-hidden"
          >
            <ShellCodeBlock
              className={classNames('mt-1.5 h-[100px] overflow-y-auto', {
                'mb-2': !isLast,
              })}
              code={action.content}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
});

const ActionList = memo(({ actions }: ActionListProps) => {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
      <ul className="list-none space-y-2">
        {actions.map((action, index) => {
          const isLast = index === actions.length - 1;
          return <ActionItem key={index} action={action} isLast={isLast} />;
        })}
      </ul>
    </motion.div>
  );
});


