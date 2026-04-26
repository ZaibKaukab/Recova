// TEMPORARY TEST HARNESS — Student A only
// Restore original App.jsx from git before merging:
//   git checkout main -- src/App.jsx
import PoseCamera from './components/PoseCamera.jsx'

export default function App() {
  return (
    <div style={{
      background: '#0a0a0a',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <PoseCamera onRep={(data) => console.log('REP COMPLETED:', data)} />
    </div>
  )
}
