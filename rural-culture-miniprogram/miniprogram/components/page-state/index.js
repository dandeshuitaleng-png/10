Component({ properties: { loading: Boolean, error: String, empty: Boolean, message: { type: String, value: '还没有学习记录，开启一段文化探索吧。' } }, methods: { retry() { this.triggerEvent('retry'); } } });
