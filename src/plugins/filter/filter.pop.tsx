import { Component, h, Host, Listen, Prop, State, Event, EventEmitter, VNode, Method } from '@stencil/core';
import { FilterType } from './filter.service';
import { RevoGrid } from '../../interfaces';
import { AndOrButton, isFilterBtn, TrashButton } from './filter.button';
import { RevoButton } from '../../components/button/button';
import '../../utils/closestPolifill';
import { LogicFunction } from './filter.types';
import { FilterCaptions } from './filter.plugin';
import debounce from 'lodash/debounce';

/**
 * @typedef FilterItem
 * @type {object}
 * @property {ColumnProp} prop - column id
 * @property {FilterType} type - filter type definition
 * @property {any} value - value for additional filtering, text value or some id
 */
export type FilterItem = {
  prop?: RevoGrid.ColumnProp;
  type?: FilterType;
  value?: any;
};

export type FilterData = {
  id: number;
  type: FilterType;
  value?: any;
  relation: 'and' | 'or';
};

export type MultiFilterItem = {
  [prop: string]: FilterData[];
};

export type ShowData = {
  x: number;
  y: number;
} & FilterItem;

const defaultType: FilterType = 'none';

const FILTER_LIST_CLASS = 'multi-filter-list';
const FILTER_LIST_CLASS_ACTION = 'multi-filter-list-action';

@Component({
  tag: 'revogr-filter-panel',
  styleUrl: 'filter.style.scss',
})
export class FilterPanel {
  private filterCaptionsInternal: FilterCaptions = {
    title: 'Filter by condition',
    save: 'Save',
    reset: 'Reset',
    cancel: 'Close',
    add: 'Add more condition...',
    placeholder: 'Enter value...',
    and: 'and',
    or: 'or',
  };
  @State() isFilterIdSet = false;
  @State() filterId = 0;
  @State() currentFilterId: number = -1;
  @State() currentFilterType: FilterType = defaultType;
  @State() changes: ShowData | undefined;
  @Prop({ mutable: true, reflect: true }) uuid: string;
  @Prop() filterItems: MultiFilterItem = {};
  @Prop() filterTypes: Record<string, string[]> = {};
  @Prop() filterNames: Record<string, string> = {};
  @Prop() filterEntities: Record<string, LogicFunction> = {};
  @Prop() filterCaptions: FilterCaptions | undefined;
  @Prop() disableDynamicFiltering: boolean = false;
  @Event() filterChange: EventEmitter<MultiFilterItem>;
  @Listen('mousedown', { target: 'document' }) onMouseDown(e: MouseEvent): void {
    if (this.changes && !e.defaultPrevented) {
      const el = e.target as HTMLElement;
      if (this.isOutside(el) && !isFilterBtn(el)) {
        this.changes = undefined;
      }
    }
  }
  @Method() async show(newEntity?: ShowData) {
    this.changes = newEntity;
    if (this.changes) {
      this.changes.type = this.changes.type || defaultType;
    }
  }

  @Method() async getChanges() {
    return this.changes;
  }

  componentWillRender() {
    if (!this.isFilterIdSet) {
      this.isFilterIdSet = true;
      const filterItems = Object.keys(this.filterItems);
      for (const prop of filterItems) {
        // we set the proper filterId so there won't be any conflict when removing filters
        this.filterId += this.filterItems[prop].length;
      }
    }
  }

  renderSelectOptions(type: FilterType, isDefaultTypeRemoved = false) {
    const options: VNode[] = [];
    const prop = this.changes?.prop;

    if (!isDefaultTypeRemoved) {
      const capts = Object.assign(this.filterCaptionsInternal, this.filterCaptions);

      options.push(
        <option selected={this.currentFilterType === defaultType} value={defaultType}>
          {prop && this.filterItems[prop] && this.filterItems[prop].length > 0 ? capts.add : this.filterNames[defaultType]}
        </option>,
      );
    }

    for (let gIndex in this.filterTypes) {
      options.push(
        ...this.filterTypes[gIndex].map(k => (
          <option value={k} selected={type === k}>
            {this.filterNames[k]}
          </option>
        )),
      );
      options.push(<option disabled></option>);
    }
    return options;
  }

  renderExtra(prop: RevoGrid.ColumnProp, index: number) {
    const currentFilter = this.filterItems[prop];

    if (!currentFilter) return '';

    if (this.filterEntities[currentFilter[index].type].extra !== 'input') return '';

    const capts = Object.assign(this.filterCaptionsInternal, this.filterCaptions);

    return (
      <input
        id={`filter-input-${currentFilter[index].id}`}
        placeholder={capts.placeholder}
        type="text"
        value={currentFilter[index].value}
        onInput={this.onUserInput.bind(this, index, prop)}
        onKeyDown={e => this.onKeyDown(e)}
      />
    );
  }

  getFilterItemsList() {
    const prop = this.changes?.prop;
    if (!(prop || prop === 0)) return '';

    const propFilters = this.filterItems[prop] || [];
    const capts = Object.assign(this.filterCaptionsInternal, this.filterCaptions);
    return (
      <div key={this.filterId}>
        {propFilters.map((d, index) => {
          let andOrButton;

          // hide toggle button if there is only one filter and the last one
          if (index !== this.filterItems[prop].length - 1) {
            andOrButton = (
              <div onClick={() => this.toggleFilterAndOr(d.id)}>
                <AndOrButton text={d.relation === 'and' ? capts.and : capts.or} />
              </div>
            );
          }

          return (
            <div key={d.id} class={FILTER_LIST_CLASS}>
              <div class={{ 'select-input': true }}>
                <select class="select-css select-filter" onChange={e => this.onFilterTypeChange(e, prop, index)}>
                  {this.renderSelectOptions(this.filterItems[prop][index].type, true)}
                </select>
                <div class={FILTER_LIST_CLASS_ACTION}>{andOrButton}</div>
                <div onClick={() => this.onRemoveFilter(d.id)}>
                  <TrashButton />
                </div>
              </div>
              <div>{this.renderExtra(prop, index)}</div>
            </div>
          );
        })}

        {propFilters.length > 0 ? <div class="add-filter-divider"></div> : ''}
      </div>
    );
  }

  render() {
    if (!this.changes) {
      return <Host style={{ display: 'none' }}></Host>;
    }
    const style = {
      display: 'block',
      left: `${this.changes.x}px`,
      top: `${this.changes.y}px`,
    };

    const capts = Object.assign(this.filterCaptionsInternal, this.filterCaptions);

    return (
      <Host style={style}>
        <label>{capts.title}</label>
        <div class="filter-holder">{this.getFilterItemsList()}</div>

        <div class="add-filter">
          <select id="add-filter" class="select-css" onChange={e => this.onAddNewFilter(e)}>
            {this.renderSelectOptions(this.currentFilterType)}
          </select>
        </div>
        <div class="filter-actions">
          {this.disableDynamicFiltering &&
            <RevoButton class={{ red: true, save: true }} onClick={() => this.onSave()}>
              {capts.save}
            </RevoButton>
          }
          <RevoButton class={{ red: true, reset: true }} onClick={() => this.onReset()}>
            {capts.reset}
          </RevoButton>
          <RevoButton class={{ light: true, cancel: true }} onClick={() => this.onCancel()}>
            {capts.cancel}
          </RevoButton>
        </div>
      </Host>
    );
  }

  private onFilterTypeChange(e: Event, prop: RevoGrid.ColumnProp, index: number) {
    const el = e.target as HTMLSelectElement;
    const type = el.value as FilterType;

    this.filterItems[prop][index].type = type;

    // this re-renders the input to know if we need extra input
    this.filterId++;

    // adding setTimeout will wait for the next tick DOM update then focus on input
    setTimeout(() => {
      const input = document.getElementById('filter-input-' + this.filterItems[prop][index].id) as HTMLInputElement;
      if (input) input.focus();
    }, 0);

    if (!this.disableDynamicFiltering) this.debouncedApplyFilter();
  }

  private debouncedApplyFilter = debounce(() => {
    this.filterChange.emit(this.filterItems);
  }, 400);

  private onAddNewFilter(e: Event) {
    const el = e.target as HTMLSelectElement;
    const type = el.value as FilterType;

    this.currentFilterType = type;
    this.addNewFilterToProp();

    // reset value after adding new filter
    const select = document.getElementById('add-filter') as HTMLSelectElement;
    if (select) {
      select.value = defaultType;
      this.currentFilterType = defaultType;
    }

    if (!this.disableDynamicFiltering) this.debouncedApplyFilter();
  }

  private addNewFilterToProp() {
    const prop = this.changes?.prop;
    if (!(prop || prop === 0)) return;

    if (!this.filterItems[prop]) {
      this.filterItems[prop] = [];
    }

    if (this.currentFilterType === 'none') return;

    this.filterId++;
    this.currentFilterId = this.filterId;

    this.filterItems[prop].push({
      id: this.currentFilterId,
      type: this.currentFilterType,
      value: '',
      relation: 'and',
    });

    // adding setTimeout will wait for the next tick DOM update then focus on input
    setTimeout(() => {
      const input = document.getElementById('filter-input-' + this.currentFilterId) as HTMLInputElement;
      if (input) input.focus();
    }, 0);
  }

  private onUserInput(index: number, prop: RevoGrid.ColumnProp, event: Event) {
    // update the value of the filter item
    this.filterItems[prop][index].value = (event.target as HTMLInputElement).value;

    if (!this.disableDynamicFiltering) this.debouncedApplyFilter();
  }

  private onKeyDown(e: KeyboardEvent) {
    if (e.key.toLowerCase() === 'enter') {
      const select = document.getElementById('add-filter') as HTMLSelectElement;
      if (select) {
        select.value = defaultType;
        this.currentFilterType = defaultType;
        this.addNewFilterToProp();
        select.focus();
      }
      return;
    }
    // keep event local, don't escalate farther to dom
    e.stopPropagation();
  }

  private onSave() {
    this.filterChange.emit(this.filterItems);
  }

  private onCancel() {
    this.changes = undefined;
  }

  private onReset() {
    this.assertChanges();

    delete this.filterItems[this.changes.prop];

    // this updates the DOM which is used by getFilterItemsList() key
    this.filterId++;

    this.filterChange.emit(this.filterItems);
  }

  private onRemoveFilter(id: number) {
    this.assertChanges();

    // this is for reactivity issues for getFilterItemsList()
    this.filterId++;

    const prop = this.changes.prop;

    const items = this.filterItems[prop];
    if (!items) return;

    const index = items.findIndex(d => d.id === id);
    if (index === -1) return;
    items.splice(index, 1);

    // let's remove the prop if no more filters so the filter icon will be removed
    if (items.length === 0) delete this.filterItems[prop];

    if (!this.disableDynamicFiltering) this.debouncedApplyFilter();
  }

  private toggleFilterAndOr(id: number) {
    this.assertChanges();

    // this is for reactivity issues for getFilterItemsList()
    this.filterId++;

    const prop = this.changes.prop;

    const items = this.filterItems[prop];
    if (!items) return;

    const index = items.findIndex(d => d.id === id);
    if (index === -1) return;

    items[index].relation = items[index].relation === 'and' ? 'or' : 'and';
    if (!this.disableDynamicFiltering) this.debouncedApplyFilter();
  }

  private assertChanges() {
    if (!this.changes) {
      throw new Error('Changes required per edit');
    }
  }

  private isOutside(e: HTMLElement | null) {
    const select = document.getElementById('add-filter') as HTMLSelectElement;
    if (select) select.value = defaultType;

    this.currentFilterType = defaultType;
    this.changes.type = defaultType;
    this.currentFilterId = -1;
    if (e.classList.contains(`[uuid="${this.uuid}"]`)) {
      return false;
    }
    return !e?.closest(`[uuid="${this.uuid}"]`);
  }
}
