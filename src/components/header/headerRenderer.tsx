import { h, VNode } from '@stencil/core';
import { RevoGrid, Selection } from '../../interfaces';
import { FilterButton } from '../../plugins/filter/filter.button';
import { SortingSign } from '../../plugins/sorting/sorting.sign';
import { ResizeEvent } from '../../services/resizable.directive';
import { DATA_COL, FOCUS_CLASS, HEADER_CLASS, HEADER_SORTABLE_CLASS, MIN_COL_SIZE } from '../../utils/consts';
import { HeaderCellRenderer } from './headerCellRenderer';

type Props = {
  depth: number;
  column: RevoGrid.VirtualPositionItem;
  data?: RevoGrid.ColumnRegular;
  range?: Selection.RangeArea;
  canResize?: boolean;
  canFilter?: boolean;
  onResize?(e: ResizeEvent): void;
  onClick?(data: RevoGrid.InitialHeaderClick): void;
  onDoubleClick?(data: RevoGrid.InitialHeaderClick): void;
};

const HeaderRenderer = (p: Props): VNode => {
  const cellClass: { [key: string]: boolean } = {
    [HEADER_CLASS]: true,
    [HEADER_SORTABLE_CLASS]: !!p.data?.sortable,
  };
  if (p.data?.order) {
    cellClass[p.data.order] = true;
  }
  const style: any = {
    width: `${p.column.size}px`,
    transform: `translateX(${p.column.start}px)`,
  };
  if (p.depth > 0) {
    style.height = (p.depth + 1) + '00%';
    style.top = `-${p.depth}00%`;
    style.backgroundColor = '#f8f9fa';
    style.display = 'flex';
    style.alignItems = 'center';
  }
  const dataProps = {
    [DATA_COL]: p.column.itemIndex,
    canResize: p.canResize,
    minWidth: p.data?.minSize || MIN_COL_SIZE,
    maxWidth: p.data?.maxSize,
    active: ['r'],
    class: cellClass,
    style: style,
    onResize: p.onResize,
    onDoubleClick(originalEvent: MouseEvent) {
      p.onDoubleClick({ column: p.data, index: p.column.itemIndex, originalEvent });
    },
    onClick(originalEvent: MouseEvent) {
      if (originalEvent.defaultPrevented || !p.onClick) {
        return;
      }
      p.onClick({ column: p.data, index: p.column.itemIndex, originalEvent });
    },
  };
  if (p.range) {
    if (p.column.itemIndex >= p.range.x && p.column.itemIndex <= p.range.x1) {
      if (typeof dataProps.class === 'object') {
        dataProps.class[FOCUS_CLASS] = true;
      }
    }
  }

  return (
    <HeaderCellRenderer data={p.data} props={dataProps}>
      {<SortingSign column={p.data} />}
      {p.canFilter && p.data?.filter !== false ? <FilterButton column={p.data} /> : ''}
    </HeaderCellRenderer>
  );
};

export default HeaderRenderer;
