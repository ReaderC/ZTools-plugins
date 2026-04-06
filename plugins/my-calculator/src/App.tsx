import { useEffect, useState } from 'react'
import Hello from './Hello'
import Read from './Read'
import Write from './Write'
import Calculator from './Calculator'

export default function App() {
  const [enterAction, setEnterAction] = useState<any>({})
  const [route, setRoute] = useState('')

  useEffect(() => {
    // ZTools 环境检查
    if (!window.ztools) {
      console.log('ZTools not detected, running in standalone mode')
      return
    }

    window.ztools.onPluginEnter((action) => {
      setRoute(action.code)
      setEnterAction(action)
    })
    window.ztools.onPluginOut(() => {
      setRoute('')
    })
  }, [])

  if (route === 'hello') return <Hello enterAction={enterAction} />
  if (route === 'read') return <Read enterAction={enterAction} />
  if (route === 'write') return <Write enterAction={enterAction} />
  if (route === 'calculator') return <Calculator enterAction={enterAction} />

  return null
}
