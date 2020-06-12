import {IReducer} from "../..";

export interface DefaultStepFn<DATA>{
    $update (reducer: IReducer<DATA> | DATA): DATA;
}
