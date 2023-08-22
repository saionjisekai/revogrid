import { h, VNode } from '@stencil/core';
import { JSXBase } from '@stencil/core/internal';
import { RevoGrid } from '../../interfaces';

export interface RowProps extends JSXBase.HTMLAttributes {
  size: number;
  start: number;
  rowClass?: string;
  depth?: number;
  attrs?: RevoGrid.CellProps | void | undefined;
}

export const PADDING_DEPTH = 10;

const RowRenderer = ({ attrs, rowClass, size, start, style, depth }: RowProps, cells: VNode[]) => {
  attrs = attrs || {};
  return (
    <div
      {...attrs}
      class={`rgRow ${rowClass || ''} ${attrs.class || ''}`}
      style={{
        ...style,
        ...attrs.style,
        height: `${size}px`,
        transform: `translateY(${start}px)`,
        paddingLeft: depth ? `${PADDING_DEPTH * depth}px` : undefined,
      }}
    >
      {cells}
    </div>
  );
};

export default RowRenderer;
