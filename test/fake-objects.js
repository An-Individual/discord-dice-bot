class TestTracker {
	constructor() {
		this.count = 0;
	}

	notifyNewDice(num) {
		this.count += num;
	}
}

module.exports = {
	TestTracker,
};