import { EventEmitter } from "events";

// ======================
// INTERNAL EVENT BUS (Architecture: Event-Driven Modular Monolith)
// Used for decoupled service-to-service communication within the server.
// This is separate from Socket.io (which handles client-facing real-time).
// ======================

class EventBus extends EventEmitter {
  constructor() {
    super();
    // Increase max listeners to handle many domain subscriptions
    this.setMaxListeners(50);
  }

  /**
   * Emit an internal domain event.
   * @param {string} event  - Event name from events.js EVENTS constants
   * @param {object} payload - Event data
   */
  dispatch(event, payload = {}) {
    this.emit(event, payload);
  }

  /**
   * Subscribe to an internal domain event.
   * @param {string} event    - Event name
   * @param {Function} handler - Handler function(payload)
   */
  subscribe(event, handler) {
    this.on(event, handler);
  }

  /**
   * Subscribe once — auto-unsubscribes after first trigger.
   * @param {string} event
   * @param {Function} handler
   */
  subscribeOnce(event, handler) {
    this.once(event, handler);
  }
}

// Singleton instance — shared across all modules
const eventBus = new EventBus();

export default eventBus;
