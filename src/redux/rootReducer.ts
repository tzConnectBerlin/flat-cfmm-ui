import { combineReducers } from '@reduxjs/toolkit';
import { StatsSlice } from './slices/StatsSlice';

const rootReducer = combineReducers({
  stats: StatsSlice.reducer,
});

export type RootState = ReturnType<typeof rootReducer>;

export default rootReducer;
