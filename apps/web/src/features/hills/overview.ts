/**
 * `GET /api/hills/overview`: every hill's scores, counts, and last change, and the newest board
 * changes on any hill. Here, not in `api/queries.ts`: every page takes that module, and only
 * `/hills` reads this. Under `['hills']`, so a finished submission reads it again with the rest.
 */
import { HillOverview, parse } from '@asmbots/protocol'
import { queryOptions, useQuery } from '@tanstack/react-query'
import { apiGet } from '../../api/client'
import { refetching } from '../../api/queries'

export const hillOverviewQuery = () =>
  queryOptions({
    queryKey: ['hills', 'overview'],
    queryFn: (context) =>
      apiGet(
        '/hills/overview',
        (v) => parse(HillOverview, v, 'the hills overview'),
        context.signal,
        refetching(context),
      ),
  })

export const useHillOverview = () => useQuery(hillOverviewQuery())
