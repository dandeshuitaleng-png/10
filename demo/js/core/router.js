const ROUTES = Object.freeze(['loading', 'home', 'map', 'level-ready', 'quiz', 'result', 'ranking', 'certificates', 'settings', 'error']);

class Router {
  constructor() { this.current = { name: 'loading', params: {} }; this.history = []; }
  navigate(name, params = {}) {
    if (!ROUTES.includes(name)) throw new Error(`Unknown route: ${name}`);
    if (name === this.current.name && JSON.stringify(params) === JSON.stringify(this.current.params)) return;
    this.history.push(this.current);
    this.current = { name, params };
  }
  replace(name, params = {}) {
    if (!ROUTES.includes(name)) throw new Error(`Unknown route: ${name}`);
    this.current = { name, params };
  }
  returnTo(name, params = {}) {
    if (!ROUTES.includes(name)) throw new Error(`Unknown route: ${name}`);
    const encoded = JSON.stringify(params);
    for (let i = this.history.length - 1; i >= 0; i--) {
      const route = this.history[i];
      if (route.name === name && JSON.stringify(route.params) === encoded) {
        this.current = route;
        this.history = this.history.slice(0, i);
        return;
      }
    }
    this.replace(name, params);
  }
  back() { this.current = this.history.pop() || { name: 'home', params: {} }; }
}

module.exports = { Router, ROUTES };
