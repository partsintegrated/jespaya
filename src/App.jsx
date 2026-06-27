import { useState } from 'react'
import data from './data.json'
import './App.css'

const preflight = (data) => {
  const errors = []
  
  Object.values(data.anchors).forEach(anchor => {
    anchor.satellites.forEach(id => {
      if (!data.satellites[id]) {
        errors.push(`Anchor "${anchor.id}" references missing satellite: "${id}"`)
      }
    })
  })

  if (errors.length > 0) {
    console.warn('Jespaya preflight errors:')
    errors.forEach(e => console.warn(e))
  } else {
    console.log('Jespaya preflight: all satellites accounted for ✓')
  }
}

const findBridges = (data) => {
  const satelliteCount = {}
  
  Object.values(data.anchors).forEach(anchor => {
    anchor.satellites.forEach(id => {
      satelliteCount[id] = (satelliteCount[id] || 0) + 1
    })
  })
  
  return Object.keys(satelliteCount).filter(id => satelliteCount[id] > 1)
}

function App() {
  preflight(data)
  const bridges = findBridges(data)

  const [currentId, setCurrentId] = useState('corps')
  const [history, setHistory] = useState([])
  const [animating, setAnimating] = useState(null)

  const allConcepts = { ...data.anchors, ...data.satellites }
  const current = allConcepts[currentId]

  const clusterColours = {
    physical: { bg: '#e8f0fe', core: '#5B7BE8' },
    maison: { bg: '#fef3e8', core: '#E8845B' },
    nature: { bg: '#e8fef0', core: '#5BE88A' },
    technologie: { bg: '#f0e8fe', core: '#A05BE8' },
    numbers: { bg: '#fef8e8', core: '#E8C45B' },
    abstract: { bg: '#fde8f0', core: '#E85BA0' }
  }

  const colours = clusterColours[current.cluster] || { bg: '#f5f5f5', core: '#333' }

  const generateNextOptions = (targetId, currentHistory) => {
    const excluded = [...currentHistory, targetId]
    const isAnchor = !!data.anchors[targetId]
    const isSatellite = !!data.satellites[targetId]
    const isBridge = bridges.includes(targetId)

    let nearOptions = []
    let abstractOptions = []

    const targetConcept = allConcepts[targetId]
    if (!targetConcept) return { near: null, abstract: null }

    if (isAnchor) {
      nearOptions = targetConcept.satellites.filter(id => 
        allConcepts[id] && !excluded.includes(id)
      )
      abstractOptions = Object.keys(data.anchors).filter(id => 
        id !== targetId && !excluded.includes(id)
      )
    }

    if (isSatellite) {
      const parentId = Array.isArray(targetConcept.parent) ? targetConcept.parent[0] : targetConcept.parent
      const parent = data.anchors[parentId]
      
      nearOptions = parent.satellites.filter(id => 
        allConcepts[id] && !excluded.includes(id) && id !== targetId
      )

      if (isBridge) {
        const otherParentId = Array.isArray(targetConcept.parent) 
          ? targetConcept.parent.find(id => id !== parentId) 
          : null
        if (otherParentId) {
          abstractOptions = [otherParentId]
        }
      } else {
        abstractOptions = Object.keys(data.anchors).filter(id => 
          !excluded.includes(id)
        )
      }
    }

    const pick = (arr) => (arr.length === 0 ? null : arr[Math.floor(Math.random() * arr.length)])

    return {
      near: pick(nearOptions),
      abstract: pick(abstractOptions)
    }
  }

  const [options, setOptions] = useState(() => generateNextOptions('corps', []))

  const navigate = (id, direction) => {
    if (animating) return 
    
    setAnimating(direction)
    
    setTimeout(() => {
      const nextHistory = [...history.slice(-4), currentId]
      
      setHistory(nextHistory)
      setCurrentId(id)
      setOptions(generateNextOptions(id, nextHistory))
      setAnimating(null)
    }, 350)
  }

  const { near: nearId, abstract: abstractId } = options

  return (
    <div className="app" style={{ backgroundColor: colours.bg }}>
      <h1>Jespaya</h1>
      <div className="node-container">
        <div style={{ width: '150px', display: 'flex', justifyContent: 'center' }}>
          {abstractId && (
            <div
              key={`abstract-${currentId}`}
              className="node-satellite abstract"
              style={{ borderColor: colours.core, color: colours.core }}
              onClick={() => navigate(abstractId, 'abstract')}
            >
              {allConcepts[abstractId]?.display.fr}
            </div>
          )}
        </div>

        <div 
          key={`core-${currentId}`}
          className={`node-core from-${animating || 'near'}`}
          style={{ backgroundColor: colours.core }}
        >
          <span className="node-fr">{current.display.fr}</span>
          <span className="node-en">{current.display.en}</span>
        </div>

        <div style={{ width: '150px', display: 'flex', justifyContent: 'center' }}>
          {nearId && (
            <div
              key={`near-${currentId}`}
              className="node-satellite near"
              style={{ borderColor: colours.core, color: colours.core }}
              onClick={() => navigate(nearId, 'near')}
            >
              {allConcepts[nearId]?.display.fr}
            </div>
          )}
        </div>
      </div>
      
      <div className="neighbourhood-tag">
        {current.cluster}
      </div>
    </div>
  )
}

export default App