import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
  const [hasInteracted, setHasInteracted] = useState(false)
  const [lastDirection, setLastDirection] = useState('near')
  const [animatingTarget, setAnimatingTarget] = useState(null); // 'near', 'abstract', or null

  const allConcepts = { ...data.anchors, ...data.satellites }
  const current = allConcepts[currentId]

  const clusterColours = {
    physical: { bg: '#e8f0fe', core: '#5B7BE8' },
    maison: { bg: '#fef3e8', core: '#E8845B' },
    nature: { bg: '#e8fef0', core: '#5BE88A' },
    technologie: { bg: '#f2f2f2', core: '#444444' },
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
  setHasInteracted(true)
  console.log('Initiating transition via:', direction);
  
  // Phase 1: Lock out the unclicked slot and trigger the physical slide direction
  setAnimatingTarget(direction);
  setLastDirection(direction);

  // Phase 2: Wait 250ms for the old core to clear and the layout to shift data
  setTimeout(() => {
    const nextHistory = [...history.slice(-2), currentId];
    setHistory(nextHistory);
    setCurrentId(id); // The core changes text NOW
    
    // Phase 3: Stagger the satellite mount. Wait another 200ms before showing new options
    setTimeout(() => {
      setOptions(generateNextOptions(id, nextHistory));
      setAnimatingTarget(null); // Unlock so they fade in cleanly
    }, 700);

  }, 250); 
};

  const { near: nearId, abstract: abstractId } = options
  if (!current) return null

const isPortrait = typeof window !== 'undefined' && window.matchMedia('(max-width: 768px) and (orientation: portrait)').matches;

const coreVariants = {
  initial: (direction) => {
    if (isPortrait) {
      return { 
        opacity: 0, 
        y: direction === 'near' ? -210 : 210, 
        x: 0,
        scale: 0.9, 
        zIndex: 1 
      };
    }
    return { 
      opacity: 0, 
      x: direction === 'near' ? 240 : -240, 
      y: 0, 
      scale: 0.9,
      zIndex: 1 
    };
  },
  animate: { 
    opacity: 1, 
    x: 0, 
    y: 0,
    scale: 1,
    zIndex: 10, // Active core is pinned securely to the top layer
    transition: { type: "spring", stiffness: 1000, damping: 65, delay: 0.4, opacity: { duration: 0.1 } } 
  },
  exit: (direction) => {
    if (isPortrait) {
      return { 
        opacity: 0, 
        y: direction === 'near' ? 210 : -210, 
        x: 0, 
        zIndex: 0, // Drop the exiting element completely to the bottom layer
        position: "absolute",
        transition: { duration: 0 } // Force a rapid fade so it clears the viewport quickly
      };
    }
    return { 
      opacity: 0, 
      x: direction === 'near' ? -240 : 240, 
      y: 0, 
      zIndex: 0, // Drop desktop exiting element to the bottom layer
      position: "absolute",
      transition: { duration: 0 } 
    };
  }
};

  return (
  <div className="app" style={{ backgroundColor: colours.bg }}>
    <h1>Jespaya</h1>
    
    <div className="node-container">
      
      {/* Abstract Option Slot - Static Key */}
      <div className="satellite-wrapper abstract-wrapper" key="abstract-slot-static">
        <AnimatePresence mode="popLayout">
          {abstractId && animatingTarget !== 'near' && (
            <motion.div
              key={abstractId} // Unique key goes inside the presence checker
              className="node-satellite abstract"
              style={{ borderColor: colours.core, color: colours.core }}
              onClick={() => navigate(abstractId, 'abstract')}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: animatingTarget === 'abstract' ? 0 : 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.1 }}
            >
              <span className="node-fr">{allConcepts[abstractId]?.display.fr}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Core Node */}
      <AnimatePresence mode="popLayout" custom={lastDirection}>
        <motion.div
          key={currentId} 
          className="node-core"
          style={{ backgroundColor: colours.core }}
          custom={lastDirection}
          variants={coreVariants}
          initial={hasInteracted ? "initial" : false}
          animate="animate"
          exit="exit"
        >
          <span className="node-fr">{current.display.fr}</span>
          <span className="node-en">{current.display.en}</span>
        </motion.div>
      </AnimatePresence>

      {/* Near Option Slot - Static Key */}
      <div className="satellite-wrapper near-wrapper" key="near-slot-static">
        <AnimatePresence mode="popLayout">
          {nearId && animatingTarget !== 'abstract' && (
            <motion.div
              key={nearId} // Unique key goes inside the presence checker
              className="node-satellite near"
              style={{ borderColor: colours.core, color: colours.core }}
              onClick={() => navigate(nearId, 'near')}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: animatingTarget === 'near' ? 0 : 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.1 }}
            >
              <span className="node-fr">{allConcepts[nearId]?.display.fr}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
    
    <div className="neighbourhood-tag">
      {current.cluster}
    </div>
  </div>
)
}

export default App