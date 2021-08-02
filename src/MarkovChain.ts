export type ProbabilityLogitMap<StateIdentifier = string> = Map<
    StateIdentifier,
    number
>;

export interface MarkovChainStateData<DataSchema, StateIdentifier = string> {
    data?: DataSchema;
    probabilityLogits: ProbabilityLogitMap<StateIdentifier>;
}

export type MarkovChainData<DataSchema, StateIdentifier = string> = Map<
    StateIdentifier,
    MarkovChainStateData<DataSchema, StateIdentifier>
>;

export function sampleFromLogits(logits: Array<number>): number {
    let randomNumber =
        Math.random() * logits.reduce((acc, cur) => acc + cur, 0);

    let resultIndex = 0;

    logits.forEach((logit, index) => {
        if (randomNumber < logit && randomNumber > 0) {
            resultIndex = index;
        }

        randomNumber -= logit;
    });

    return resultIndex;
}

export class MarkovChain<DataSchema, StateIdentifier = string> {
    private __stateMap: MarkovChainData<DataSchema, StateIdentifier>;
    private __currentState: StateIdentifier;

    get currentState() {
        return this.__currentState;
    }

    set currentState(newState: StateIdentifier) {
        this.__currentState = newState;
    }

    get stateMap() {
        return this.__stateMap;
    }

    public setStateData(stateId: StateIdentifier, data: DataSchema) {
        this.__stateMap.set(stateId, {
            data,
            probabilityLogits: this.__stateMap.get(stateId).probabilityLogits,
        });
        return this;
    }

    public setStateProbability(
        stateId: StateIdentifier,
        probabilityLogits: ProbabilityLogitMap<StateIdentifier>
    ) {
        this.__stateMap.set(stateId, {
            probabilityLogits,
            data: this.__stateMap.get(stateId).data,
        });
        return this;
    }

    public evolveState() {
        let currentStateData = this.__stateMap.get(this.__currentState);
        let newStateIndex: number = sampleFromLogits([
            ...currentStateData.probabilityLogits.values(),
        ]);
        return [...currentStateData.probabilityLogits.keys()][newStateIndex];
    }

    public evolveStateM() {
        this.__currentState = this.evolveState();
        return this;
    }

    constructor(
        stateMap: MarkovChainData<DataSchema, StateIdentifier>,
        initialState: StateIdentifier
    ) {
        this.__stateMap = stateMap;
        this.__currentState = initialState;
    }
}
