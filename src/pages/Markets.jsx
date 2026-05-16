import Sidebar from '../components/Sidebar'

export default function Markets() {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="empty-component" style={{ gridColumn: '2 / 5', gridRow: '1 / 5' }}>
        Markets Explorer Coming Soon
      </div>
    </div>
  )
}
