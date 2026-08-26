/** Expand optional keys while retaining their original field types. */
export type Required<T> = { [K in keyof T]-?: T[K] }
