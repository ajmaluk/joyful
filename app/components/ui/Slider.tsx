import { motion } from 'framer-motion';
import { memo } from 'react';
import { classNames } from '~/utils/classNames';
import { cubicEasingFn } from '~/utils/easings';
import { genericMemo } from '~/utils/react';

interface SliderOption<T> {
  value: T;
  text: string;
  icon?: string;
}

export interface SliderOptions<T> {
  left: SliderOption<T>;
  right: SliderOption<T>;
}

interface SliderProps<T> {
  selected: T;
  options: SliderOptions<T>;
  setSelected?: (selected: T) => void;
}

export const Slider = genericMemo(<T,>({ selected, options, setSelected }: SliderProps<T>) => {
  const isLeftSelected = selected === options.left.value;

  return (
    <div className="flex items-center flex-wrap shrink-0 gap-1 bg-bolt-elements-background-depth-1 overflow-hidden rounded-full p-1">
      <SliderButton selected={isLeftSelected} setSelected={() => setSelected?.(options.left.value)}>
        {options.left.icon ? <div className={classNames(options.left.icon, 'text-sm')} /> : null}
        <span>{options.left.text}</span>
      </SliderButton>
      <SliderButton selected={!isLeftSelected} setSelected={() => setSelected?.(options.right.value)}>
        {options.right.icon ? <div className={classNames(options.right.icon, 'text-sm')} /> : null}
        <span>{options.right.text}</span>
      </SliderButton>
    </div>
  );
});

interface SliderButtonProps {
  selected: boolean;
  children: React.ReactNode;
  setSelected: () => void;
}

const SliderButton = memo(({ selected, children, setSelected }: SliderButtonProps) => {
  return (
    <button
      onClick={setSelected}
      className={classNames(
        'bg-transparent text-sm px-3 py-1.5 rounded-lg relative inline-flex items-center gap-2',
        selected
          ? 'text-bolt-elements-item-contentAccent'
          : 'text-bolt-elements-item-contentDefault hover:text-bolt-elements-item-contentActive',
      )}
    >
      <span className="relative z-10">{children}</span>
      {selected && (
        <motion.span
          layoutId="pill-tab"
          transition={{ duration: 0.2, ease: cubicEasingFn }}
          className="absolute inset-0 z-0 bg-bolt-elements-item-backgroundAccent rounded-full"
        ></motion.span>
      )}
    </button>
  );
});
