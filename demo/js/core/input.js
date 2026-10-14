function contains(rect, point) {
  return point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h;
}

class Input {
  constructor(onAction, onScroll = null) { this.onAction = onAction; this.onScroll=onScroll; this.scrollRegion=null; this.targets = []; this.active = null; }
  setTargets(targets) { this.targets = targets; }
  start(point, id = 0) {
    if (this.active) return;
    const target = [...this.targets].reverse().find((item) => !item.disabled && contains(item, point));
    if (target || (this.scrollRegion && contains(this.scrollRegion,point))) this.active = { target, start: point, last:point, id, cancelled: false, dragging: false, scroll:!!(this.scrollRegion&&contains(this.scrollRegion,point)) };
  }
  move(point, id = 0) {
    if (!this.active || this.active.id !== id) return;
    if(this.active.scroll&&(this.active.dragging||Math.abs(point.y-this.active.start.y)>12)){
      this.active.dragging=true;this.active.cancelled=true;
      if(this.onScroll)this.onScroll(this.active.last.y-point.y);
    }
    this.active.last=point;
    if (!this.active.target || !contains(this.active.target, point) || Math.hypot(point.x - this.active.start.x, point.y - this.active.start.y) > 12) this.active.cancelled = true;
  }
  end(point, id = 0) {
    if (!this.active || this.active.id !== id) return;
    const { target, cancelled } = this.active;
    this.active = null;
    if (target && !cancelled && contains(target, point)) this.onAction(target.action);
  }
  cancel() { this.active = null; }
  get pressedId() { return this.active && !this.active.cancelled && this.active.target ? this.active.target.id : null; }
}

module.exports = { Input, contains };
