import type { UseMutationOptions } from '@tanstack/react-query'

export type MutationOptions<Data, Variables = void> = Omit<
  UseMutationOptions<Data, Error, Variables>,
  'mutationFn' | 'onMutate'
>
export type ReadOptions = {
  enabled?: boolean
  refetchOnMount?: boolean | 'always'
  refetchOnWindowFocus?: boolean
}
