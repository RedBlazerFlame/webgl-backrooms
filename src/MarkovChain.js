export function sampleFromLogits(logits) {
    let randomNumber = Math.random() * logits.reduce((acc, cur) => acc + cur, 0);
    let resultIndex = 0;
    logits.forEach((logit, index) => {
        if (randomNumber < logit && randomNumber > 0) {
            resultIndex = index;
        }
        randomNumber -= logit;
    });
    return resultIndex;
}
export class MarkovChain {
    constructor(stateMap, initialState) {
        this.__stateMap = stateMap;
        this.__currentState = initialState;
    }
    get currentState() {
        return this.__currentState;
    }
    set currentState(newState) {
        this.__currentState = newState;
    }
    get stateMap() {
        return this.__stateMap;
    }
    setStateData(stateId, data) {
        this.__stateMap.set(stateId, {
            data,
            probabilityLogits: this.__stateMap.get(stateId).probabilityLogits,
        });
        return this;
    }
    setStateProbability(stateId, probabilityLogits) {
        this.__stateMap.set(stateId, {
            probabilityLogits,
            data: this.__stateMap.get(stateId).data,
        });
        return this;
    }
    evolveState() {
        let currentStateData = this.__stateMap.get(this.__currentState);
        let newStateIndex = sampleFromLogits([
            ...currentStateData.probabilityLogits.values(),
        ]);
        return [...currentStateData.probabilityLogits.keys()][newStateIndex];
    }
    evolveStateM() {
        this.__currentState = this.evolveState();
        return this;
    }
}
