import { Wrench } from 'lucide-react'

const Logo = ({ className }) => {
  return (
    <div className={`text-primary ${className}`}>
      <Wrench />
    </div>
  )
}

export default Logo