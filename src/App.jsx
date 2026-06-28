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
    console.warn('Jespaya preflight errors:', errors)
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
  
  // Track system flow state
  const [activeTargetId, setActiveTargetId] = useState(null) // Stores the clicked ID during navigation
  const [slideTriggered, setSlideTriggered] = useState(false) // Triggers the center glide
  const [lastDirection, setLastDirection] = useState('near')

  const allConcepts = { ...data.anchors, ...data.satellites }
  const current = allConcepts[currentId]

  const clusterColours = {
    physical: { bg: '#e8f0fe', core: '#5B7BE8' },
    maison: { bg: '#fef3e8', core: '#E8845B' },
    nature: { bg: '#e8fef0', core: '#5BE88A' },
    technologie: { bg: '#f0e8fe', core: '#A05BE8' },
    numbers: { bg: '#fef8e8', core: '#E8C45B' },
    abstract: { bg: '#fde8f0', core: '#E85BA0' },
    dehors: { bg: '#edf7ed', core: '#4a8c4a' },
  }

  const colours = clusterColours[current?.cluster] || { bg: '#f5f5f5', core: '#333' }

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
      nearOptions = targetConcept.satellites.filter(id => allConcepts[id] && !excluded.includes(id))
      abstractOptions = Object.keys(data.anchors).filter(id => id !== targetId && !excluded.includes(id))
    }

    if (isSatellite) {
      const parentId = Array.isArray(targetConcept.parent) ? targetConcept.parent[0] : targetConcept.parent
      const parent = data.anchors[parentId]
      
      nearOptions = parent ? parent.satellites.filter(id => allConcepts[id] && !excluded.includes(id) && id !== targetId) : []

      if (isBridge) {
        const otherParentId = Array.isArray(targetConcept.parent) ? targetConcept.parent.find(id => id !== parentId) : null
        if (otherParentId) abstractOptions = [otherParentId]
      } else {
        abstractOptions = Object.keys(data.anchors).filter(id => !excluded.includes(id))
      }
    }

    const pick = (arr) => (arr.length === 0 ? null : arr[Math.floor(Math.random() * arr.length)])
    return { near: pick(nearOptions), abstract: pick(abstractOptions) }
  }

  const [options, setOptions] = useState(() => generateNextOptions('corps', []))

  const navigate = (id, direction) => {
    if (activeTargetId) return
    
    setLastDirection(direction)
    setActiveTargetId(id) // System enters "charging" phase natively for this ID
    
    // Act I: Charge up and expand in place (350ms)
    setTimeout(() => {
      setSlideTriggered(true) // Act II: Initiate center glide
      
      // Act III: Swap data cleanly at the end of the physical slide path (400ms)
      setTimeout(() => {
        const nextHistory = [...history.slice(-2), currentId]
        setHistory(nextHistory)
        setCurrentId(id)
        setOptions(generateNextOptions(id, nextHistory))
        
        // Reset navigation states completely
        setActiveTargetId(null)
        setSlideTriggered(false)
      }, 550)
    }, 350) 
  }

  const { near: nearId, abstract: abstractId } = options
  if (!current) return null

  return (
    <div className="app" style={{ backgroundColor: colours.bg }}>
      <h1>Jespaya</h1>
      
      <div className={`node-container ${activeTargetId ? 'system-navigating' : 'system-idle'}`}>
        
        {/* Abstract Option */}
        <div className="satellite-wrapper abstract-wrapper" key={`abstract-slot-${abstractId || 'empty'}`}>
          {abstractId && (
            <div
              className={`node-satellite abstract ${activeTargetId === abstractId ? 'active-target' : ''} ${slideTriggered && activeTargetId === abstractId ? 'slide-to-center' : ''}`}
              style={{ 
                borderColor: colours.core, 
                color: activeTargetId === abstractId ? '#fff' : colours.core,
                backgroundColor: activeTargetId === abstractId ? colours.core : 'transparent'
              }}
              onClick={() => navigate(abstractId, 'abstract')}
            >
              <span className="node-fr">{allConcepts[abstractId]?.display.fr}</span>
              {activeTargetId === abstractId && (
                <span className="node-en satellite-translation">{allConcepts[abstractId]?.display.en}</span>
              )}
            </div>
          )}
        </div>

        {/* Core Node */}
        <div 
          key={`core-${currentId}`} 
          className={`node-core ${activeTargetId ? 'exiting' : `from-${lastDirection}`}`}
          style={{ backgroundColor: colours.core }}
        >
          <span className="node-fr">{current.display.fr}</span>
          <span className="node-en">{current.display.en}</span>
        </div>

        {/* Near Option */}
        <div className="satellite-wrapper near-wrapper" key={`near-slot-${nearId || 'empty'}`}>
          {nearId && (
            <div
              className={`node-satellite near ${activeTargetId === nearId ? 'active-target' : ''} ${slideTriggered && activeTargetId === nearId ? 'slide-to-center' : ''}`}
              style={{ 
                borderColor: colours.core, 
                color: activeTargetId === nearId ? '#fff' : colours.core,
                backgroundColor: activeTargetId === nearId ? colours.core : 'transparent'
              }}
              onClick={() => navigate(nearId, 'near')}
            >
              <span className="node-fr">{allConcepts[nearId]?.display.fr}</span>
              {activeTargetId === nearId && (
                <span className="node-en satellite-translation">{allConcepts[nearId]?.display.en}</span>
              )}
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