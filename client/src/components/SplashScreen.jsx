import { useEffect, useState } from 'react'

const floatingIcons = [
  { img: '/3d_wallet_icon_1777574054599.png', delay: '400ms', posClass: 'pos-1', scale: 1.1 },
  { img: '/3d_chart_icon_1777574072812.png', delay: '450ms', posClass: 'pos-2', scale: 0.9 },
  { img: '/3d_users_icon_1777574102662.png', delay: '500ms', posClass: 'pos-3', scale: 1 },
  { img: '/3d_shield_icon_1777574088379.png', delay: '550ms', posClass: 'pos-4', scale: 0.95 },
  { img: '/3d_coins_icon_1777574267589.png', delay: '420ms', posClass: 'pos-5', scale: 1.2 },
  { img: '/3d_credit_card_icon_1777574281223.png', delay: '470ms', posClass: 'pos-6', scale: 1.05 },
  { img: '/3d_piggy_bank_icon_1777574295472.png', delay: '520ms', posClass: 'pos-7', scale: 0.85 },
  { img: '/3d_calculator_icon_1777574313558.png', delay: '570ms', posClass: 'pos-8', scale: 0.9 },
  { img: '/3d_lock_icon_1777574334295.png', delay: '440ms', posClass: 'pos-9', scale: 0.8 },
  { img: '/3d_gift_icon_1777574349620.png', delay: '490ms', posClass: 'pos-10', scale: 1 },
  { img: '/3d_target_icon_1777574366460.png', delay: '540ms', posClass: 'pos-11', scale: 0.95 },
]

export function SplashScreen({ onComplete }) {
  const [stage, setStage] = useState('entering')

  useEffect(() => {
    // Sequence of animations
    const t1 = setTimeout(() => setStage('pulsing'), 800) // Initial delay before pulse
    const t2 = setTimeout(() => setStage('exiting'), 4500) // Much longer display time
    const t3 = setTimeout(() => onComplete(), 5200)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [onComplete])

  return (
    <div className={`splash-screen ${stage}`}>
      <div className="splash-logo-container">
        {floatingIcons.map(({ img, delay, posClass, scale }, i) => (
          <div key={i} className={`splash-float-icon ${posClass}`} style={{ animationDelay: delay }}>
            <img src={img} alt="3D Splash Element" style={{ width: 120, height: 120, objectFit: 'contain', transform: `scale(${scale})`, mixBlendMode: 'multiply' }} />
          </div>
        ))}
        <img src="/logo.png" alt="Arthika" className="splash-logo" style={{ transform: 'scale(1.2)' }} />
        <div className="splash-glow"></div>
      </div>
    </div>
  )
}
