/* eslint-disable lit/prefer-static-styles */
import type { PropertyValues } from "lit";
import { html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import type { SortableEvent } from "sortablejs";
import { fireEvent } from "../common/dom/fire_event";
import type { SortableInstance } from "../resources/sortable";

declare global {
  interface HASSDomEvents {
    "item-moved": {
      oldIndex: number;
      newIndex: number;
      deltaX?: number;
    };
    "item-dragged": {
      oldIndex: number;
      newIndex: number;
      deltaX: number;
    };
    "item-dragging": {
      item: HTMLElement;
      deltaX: number;
    };
    "item-added": {
      index: number;
      data: any;
      item: any;
    };
    "item-removed": {
      index: number;
    };
    "drag-start": undefined;
    "drag-end": undefined;
  }
}

export type HaSortableOptions = Omit<
  SortableInstance.SortableOptions,
  "onStart" | "onChoose" | "onEnd" | "onUpdate" | "onAdd" | "onRemove"
>;

@customElement("ha-sortable")
export class HaSortable extends LitElement {
  private _sortable?: SortableInstance;
  private _draggedItem?: HTMLElement;

  // conserve the horizontal position of the mouse when dragging, to be able to calculate the deltaX when moving an item. This is useful for horizontal lists, where the newIndex can be the same as the oldIndex, but the item has moved horizontally.
  private _dragStartX?: number;
  private _dragEndX?: number;

  @property({ type: Boolean })
  public disabled = false;

  @property({ type: Boolean, attribute: "no-style" })
  public noStyle = false;

  @property({ type: String, attribute: "draggable-selector" })
  public draggableSelector?: string;

  @property({ type: String, attribute: "handle-selector" })
  public handleSelector?: string;

  /**
   * Selectors that do not lead to dragging (String or Function)
   * https://github.com/SortableJS/Sortable?tab=readme-ov-file#filter-option
   * */
  @property({ type: String, attribute: "filter" })
  public filter?: string;

  @property({ type: String })
  public group?: string | SortableInstance.GroupOptions;

  @property({ type: Boolean, attribute: "invert-swap" })
  public invertSwap = false;

  @property({ attribute: false })
  public options?: HaSortableOptions;

  @property({ type: Boolean })
  public rollback = true;

  protected updated(changedProperties: PropertyValues<this>) {
    if (changedProperties.has("disabled")) {
      if (this.disabled) {
        this._destroySortable();
      } else {
        this._createSortable();
      }
    }
  }

  // Workaround for connectedCallback just after disconnectedCallback (when dragging sortable with sortable children)
  private _shouldBeDestroy = false;

  public disconnectedCallback() {
    this.removeEventListener("pointerdown", this._handlePointerDown);
    window.removeEventListener("pointermove", this._handlePointerMove);
    window.removeEventListener("pointerup", this._handlePointerUp, true);
    super.disconnectedCallback();
    this._shouldBeDestroy = true;
    setTimeout(() => {
      if (this._shouldBeDestroy) {
        this._destroySortable();
        this._shouldBeDestroy = false;
      }
    }, 1);
  }

  public connectedCallback() {
    this.addEventListener("pointerdown", this._handlePointerDown);
    super.connectedCallback();
    this._shouldBeDestroy = false;
    if (this.hasUpdated && !this.disabled) {
      this._createSortable();
    }
  }

  protected createRenderRoot() {
    return this;
  }

  protected render() {
    if (this.noStyle) return nothing;
    return html`
      <style>
        .sortable-fallback {
          display: none !important;
        }

        .sortable-ghost {
          box-shadow: 0 0 0 2px var(--primary-color);
          background: rgba(var(--rgb-primary-color), 0.25);
          border-radius: var(--ha-border-radius-sm);
          opacity: 0.4;
        }

        .sortable-drag {
          border-radius: var(--ha-border-radius-sm);
          opacity: 1;
          background: var(--card-background-color);
          box-shadow: 0px 4px 8px 3px #00000026;
          cursor: grabbing;
        }
      </style>
    `;
  }

  private async _createSortable() {
    if (this._sortable) return;
    const container = this.children[0] as HTMLElement | undefined;

    if (!container) return;

    // eslint-disable-next-line @typescript-eslint/naming-convention
    const Sortable = (await import("../resources/sortable")).default;

    const options: SortableInstance.Options = {
      scroll: true,
      // Force the autoscroll fallback because it works better than the native one
      forceAutoScrollFallback: true,
      scrollSpeed: 20,
      animation: 150,
      ...this.options,
      onChoose: this._handleChoose,
      onStart: this._handleStart,
      onEnd: this._handleEnd,
      onUpdate: this._handleUpdate,
      onAdd: this._handleAdd,
      onRemove: this._handleRemove,
    };

    if (this.draggableSelector) {
      options.draggable = this.draggableSelector;
    }
    if (this.handleSelector) {
      options.handle = this.handleSelector;
    }
    if (this.invertSwap !== undefined) {
      options.invertSwap = this.invertSwap;
    }
    if (this.group) {
      options.group = this.group;
    }
    if (this.filter) {
      options.filter = this.filter;
    }

    this._sortable = new Sortable(container, options);
  }

  private _handleUpdate = (evt) => {
    const deltaX =
      this._dragStartX !== undefined && this._dragEndX !== undefined
        ? this._dragEndX - this._dragStartX
        : 0;
    // Fire an event with the new and old index of the moved item, and the deltaX of the mouse movement
    fireEvent(this, "item-moved", {
      newIndex: evt.newIndex,
      oldIndex: evt.oldIndex,
      deltaX,
    });

    this._dragStartX = undefined;
    this._dragEndX = undefined;
  };

  private _handleAdd = (evt) => {
    fireEvent(this, "item-added", {
      index: evt.newIndex,
      data: evt.item.sortableData,
      item: evt.item,
    });
  };

  private _handleRemove = (evt) => {
    fireEvent(this, "item-removed", { index: evt.oldIndex });
  };

  private _handleEnd = async (evt) => {
    window.removeEventListener("pointermove", this._handlePointerMove);
    if (
      evt.oldIndex === evt.newIndex &&
      this._dragStartX !== undefined &&
      this._dragEndX !== undefined
    ) {
      fireEvent(this, "item-dragged", {
        oldIndex: evt.oldIndex,
        newIndex: evt.newIndex,
        deltaX: this._dragEndX - this._dragStartX,
      });
    }
    this._dragStartX = undefined;
    this._dragEndX = undefined;
    this._draggedItem = undefined;
    fireEvent(this, "drag-end");
    // put back in original location
    if (this.rollback && (evt.item as any).placeholder) {
      (evt.item as any).placeholder.replaceWith(evt.item);
      delete (evt.item as any).placeholder;
    }
  };

  private _handleStart = (evt: SortableEvent) => {
    this._draggedItem = evt.item as HTMLElement;
    window.addEventListener("pointermove", this._handlePointerMove);
    fireEvent(this, "drag-start");
  };

  private _handleChoose = (evt: SortableEvent) => {
    if (!this.rollback) return;
    (evt.item as any).placeholder = document.createComment("sort-placeholder");
    evt.item.after((evt.item as any).placeholder);
  };

  private _destroySortable() {
    if (!this._sortable) return;
    this._sortable.destroy();
    this._sortable = undefined;
  }

  private _handlePointerDown = (ev: PointerEvent) => {
    this._dragStartX = ev.clientX;
    // Listen for pointerup to get the final position of the mouse when dragging,
    // to be able to calculate the deltaX when moving an item
    window.addEventListener("pointerup", this._handlePointerUp, {
      once: true,
      capture: true,
    });
  };

  private _handlePointerUp = (ev: PointerEvent) => {
    this._dragEndX = ev.clientX;
  };

  private _handlePointerMove = (ev: PointerEvent) => {
    if (this._dragStartX === undefined || !this._draggedItem) return;
    fireEvent(this, "item-dragging", {
      item: this._draggedItem,
      deltaX: ev.clientX - this._dragStartX,
    });
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-sortable": HaSortable;
  }
}
