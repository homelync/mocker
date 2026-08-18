import { useEffect, useState } from 'react'
import { deviceListSchema } from '../api/devices'
import type { DeviceList } from '../api/devices'

/**
 * A table of the devices installed at one property.
 *
 * Fetches for itself, which is the whole reason the MSW half of the adapter
 * exists: nothing can be passed in from the story, so the only way to see this
 * component in a state is to answer the request it makes.
 *
 * It parses the response with the very schema the mock generated it from —
 * which is what makes the preview a real check on the contract rather than a
 * picture of some data.
 */

interface State {
  readonly status: 'loading' | 'ready' | 'error'
  readonly data?: DeviceList
  readonly message?: string
}

export function DeviceTable({ reference }: { reference: string }) {
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    let live = true
    setState({ status: 'loading' })

    fetch(`/api/devices?propertyReference=${encodeURIComponent(reference)}`)
      .then(async (response) => {
        if (!response.ok)
          throw new Error(`The API answered ${response.status}.`)
        return deviceListSchema.parse(await response.json())
      })
      .then((data) => {
        if (live) setState({ status: 'ready', data })
      })
      .catch((error: unknown) => {
        if (live) {
          setState({
            status: 'error',
            message: error instanceof Error ? error.message : String(error),
          })
        }
      })

    return () => {
      live = false
    }
  }, [reference])

  if (state.status === 'loading') return <p>Loading devices…</p>
  if (state.status === 'error') return <p role="alert">{state.message}</p>

  const data = state.data!
  if (data.results.length === 0) {
    return <p>No devices are installed at {data.propertyReference}.</p>
  }

  return (
    <table>
      <caption>
        {data.count} device(s) at {data.propertyReference}, page {data.page} of{' '}
        {data.totalPages}
      </caption>
      <thead>
        <tr>
          <th>Serial</th>
          <th>Room</th>
          <th>Status</th>
          <th>Last seen</th>
        </tr>
      </thead>
      <tbody>
        {data.results.map((device) => (
          <tr key={device.id}>
            <td>{device.serialNumber}</td>
            <td>{device.room}</td>
            <td>{device.statusId}</td>
            <td>{device.lastSeenAt?.slice(0, 10) ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
