import { Observable, Selection } from '../../interfaces';
import { getRange } from '../../store/selection/selection.helpers';
import SelectionStoreService from '../../store/selection/selection.store.service';
import { codesLetter } from '../../utils/keyCodes';
import { isClear, isCtrlKey, isEnterKeyValue, isLetterKey, isTabKeyValue } from '../../utils/keyCodes.utils';
import { timeout } from '../../utils/utils';
import { EventData, getCoordinate, isAfterLast, isBeforeFirst } from './selection.utils';

type Config = {
  selectionStoreService: SelectionStoreService;
  selectionStore: Observable<Selection.SelectionStoreState>;
  doEdit(val?: any): void;
  cancelEdit(): void;
  clearCell(): void;
  getData(): any;
  internalPaste(): void;
};

export class KeyboardService {
  private ctrlDown = false;

  constructor(private sv: Config) {}

  async keyDown(e: KeyboardEvent, canRange: boolean) {
    if (!this.sv.selectionStoreService.focused) {
      return;
    }
    if (isCtrlKey(e.keyCode, navigator.platform)) {
      this.ctrlDown = true;
    }

    // tab key means same as arrow right
    if (codesLetter.TAB === e.code) {
      this.keyChangeSelection(e, canRange);
      return;
    }

    /**
     *  IF EDIT MODE
     */
    if (this.sv.selectionStoreService.edited) {
      switch (e.code) {
        case codesLetter.ESCAPE:
          this.sv.cancelEdit();
          break;
      }
      return;
    }

    /**
     *  IF NOT EDIT MODE
     */

    // pressed clear key
    if (isClear(e.code)) {
      // this.sv.clearCell();
      return;
    }

    // pressed enter
    if (isEnterKeyValue(e.key)) {
      this.sv.doEdit();
      return;
    }

    // copy or save operation
    if (this.isCopy(e) || this.isSave(e)) {
      return;
    }

    if (this.ctrlDown && (
      e.code == 'KeyN'
      || e.code == 'KeyO'
      || e.code == 'KeyK'
      || e.code == 'KeyF'
      || e.code == 'KeyR'
      || e.code == 'KeyH'
    )) {
      this.ctrlDown = false;
      return;
    }

    // paste operation
    if (this.isPaste(e)) {
      this.sv.internalPaste();
      return;
    }

    // pressed letter key
    if (isLetterKey(e.keyCode)) {
      this.sv.doEdit(e.key);
      return;
    }

    // pressed home
    if (codesLetter.HOME === e.code) {
      const cell = this.sv.selectionStoreService.focused;
      cell.x = 0;
      if (this.ctrlDown) cell.y = 0;
      this.sv.selectionStoreService.focus(cell);
      return e.preventDefault();
    }

    // pressed end
    if (codesLetter.END === e.code) {
      const cell = this.sv.selectionStoreService.focused;
      cell.x = 999999;
      if (this.ctrlDown) cell.y = 999999;
      this.sv.selectionStoreService.focus(cell);
      return e.preventDefault();
    }

    // pressed arrow, change selection position
    if (await this.keyChangeSelection(e, canRange)) {
      return;
    }
  }

  async keyChangeSelection(e: KeyboardEvent, canRange: boolean) {
    const data = this.changeDirectionKey(e, canRange);
    if (!data) {
      return false;
    }
    await timeout();

    const range = this.sv.selectionStore.get('range');
    const focus = this.sv.selectionStore.get('focus');
    return this.keyPositionChange(data.changes, this.sv.getData(), range, focus, data.isMulti);
  }

  keyPositionChange(changes: Partial<Selection.Cell>, eData: EventData, range?: Selection.RangeArea, focus?: Selection.Cell, isMulti = false) {
    if (!range || !focus) {
      return false;
    }
    const data = getCoordinate(range, focus, changes, isMulti);
    if (!data) {
      return false;
    }
    if (isMulti) {
      if (isAfterLast(data.end, eData) || isBeforeFirst(data.start)) {
        return false;
      }
      const range = getRange(data.start, data.end);
      return this.sv.selectionStoreService.changeRange(range);
    }
    return this.sv.selectionStoreService.focus(data.start);
  }

  keyUp(e: KeyboardEvent): void {
    if (isCtrlKey(e.keyCode, navigator.platform)) {
      this.ctrlDown = false;
    }
  }

  isCopy(e: KeyboardEvent): boolean {
    return this.ctrlDown && e.code == codesLetter.C;
  }

  isPaste(e: KeyboardEvent): boolean {
    return this.ctrlDown && e.code == codesLetter.V;
  }

  isSave(e: KeyboardEvent): boolean {
    return this.ctrlDown && e.code == codesLetter.S;
  }

  /** Monitor key direction changes */
  changeDirectionKey(e: KeyboardEvent, canRange: boolean): { changes: Partial<Selection.Cell>; isMulti?: boolean } | void {
    const isMulti: boolean = canRange && e.shiftKey;
    switch (e.code) {
      case codesLetter.TAB:
      case codesLetter.ARROW_UP:
      case codesLetter.ARROW_DOWN:
      case codesLetter.ARROW_LEFT:
      case codesLetter.ARROW_RIGHT:
        e.preventDefault();
        break;
    }
    if (e.code === codesLetter.ARROW_UP) return { changes: { y: -1 }, isMulti };
    if (e.code === codesLetter.ARROW_DOWN) return { changes: { y: 1 }, isMulti };
    const isTab = isTabKeyValue(e.code);
    if (e.code === codesLetter.ARROW_LEFT || (isTab && e.shiftKey)) return { changes: { x: -1 }, isMulti };
    if (e.code === codesLetter.ARROW_RIGHT || isTab) return { changes: { x: 1 }, isMulti };
  }
}
