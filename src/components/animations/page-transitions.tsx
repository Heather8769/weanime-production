'use client'

import { motion, AnimatePresence, Variants } from 'framer-motion'
import { ReactNode } from 'react'

// Page transition variants
const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.98,
  },
  in: {
    opacity: 1,
    y: 0,
    scale: 1,
  },
  out: {
    opacity: 0,
    y: -20,
    scale: 1.02,
  },
}

const pageTransition = {
  type: 'tween',
  ease: 'anticipate',
  duration: 0.4,
}

// Slide transition variants
const slideVariants: Variants = {
  initial: (direction: number) => ({
    x: direction > 0 ? 1000 : -1000,
    opacity: 0,
  }),
  in: {
    x: 0,
    opacity: 1,
  },
  out: (direction: number) => ({
    x: direction < 0 ? 1000 : -1000,
    opacity: 0,
  }),
}

// Fade transition variants
const fadeVariants: Variants = {
  initial: {
    opacity: 0,
  },
  in: {
    opacity: 1,
  },
  out: {
    opacity: 0,
  },
}

// Scale transition variants
const scaleVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.8,
  },
  in: {
    opacity: 1,
    scale: 1,
  },
  out: {
    opacity: 0,
    scale: 1.2,
  },
}

interface PageTransitionProps {
  children: ReactNode
  variant?: 'default' | 'slide' | 'fade' | 'scale'
  direction?: number
  className?: string
}

export function PageTransition({
  children,
  variant = 'default',
  direction = 0,
  className = '',
}: PageTransitionProps) {
  const getVariants = () => {
    switch (variant) {
      case 'slide':
        return slideVariants
      case 'fade':
        return fadeVariants
      case 'scale':
        return scaleVariants
      default:
        return pageVariants
    }
  }

  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={getVariants()}
      transition={pageTransition}
      custom={direction}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Stagger animation for lists
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      delayChildren: 0.1,
      staggerChildren: 0.1,
    },
  },
}

const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 100,
    },
  },
}

interface StaggerAnimationProps {
  children: ReactNode
  className?: string
  delay?: number
  stagger?: number
}

export function StaggerAnimation({
  children,
  className = '',
  delay = 0.1,
  stagger = 0.1,
}: StaggerAnimationProps) {
  const customContainerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: delay,
        staggerChildren: stagger,
      },
    },
  }

  return (
    <motion.div
      variants={customContainerVariants}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <motion.div variants={itemVariants} className={className}>
      {children}
    </motion.div>
  )
}

// Floating animation for decorative elements
export function FloatingElement({
  children,
  duration = 6,
  delay = 0,
  intensity = 10,
  className = '',
}: {
  children: ReactNode
  duration?: number
  delay?: number
  intensity?: number
  className?: string
}) {
  return (
    <motion.div
      animate={{
        y: [-intensity, intensity, -intensity],
        x: [-intensity / 2, intensity / 2, -intensity / 2],
        rotate: [-1, 1, -1],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Parallax scrolling effect
export function ParallaxElement({
  children,
  speed = 0.5,
  className = '',
}: {
  children: ReactNode
  speed?: number
  className?: string
}) {
  return (
    <motion.div
      style={{
        y: `${speed * 100}%`,
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Magnetic hover effect
export function MagneticElement({
  children,
  strength = 0.3,
  className = '',
}: {
  children: ReactNode
  strength?: number
  className?: string
}) {
  return (
    <motion.div
      whileHover={{
        scale: 1 + strength * 0.1,
      }}
      whileTap={{
        scale: 1 - strength * 0.1,
      }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 17,
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Reveal animation on scroll
export function RevealOnScroll({
  children,
  direction = 'up',
  delay = 0,
  className = '',
}: {
  children: ReactNode
  direction?: 'up' | 'down' | 'left' | 'right'
  delay?: number
  className?: string
}) {
  const getInitialPosition = () => {
    switch (direction) {
      case 'up':
        return { y: 50, opacity: 0 }
      case 'down':
        return { y: -50, opacity: 0 }
      case 'left':
        return { x: 50, opacity: 0 }
      case 'right':
        return { x: -50, opacity: 0 }
      default:
        return { y: 50, opacity: 0 }
    }
  }

  return (
    <motion.div
      initial={getInitialPosition()}
      whileInView={{
        x: 0,
        y: 0,
        opacity: 1,
      }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{
        duration: 0.6,
        delay,
        ease: 'easeOut',
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Loading spinner with advanced animation
export function LoadingSpinner({
  size = 40,
  color = 'currentColor',
  className = '',
}: {
  size?: number
  color?: string
  className?: string
}) {
  return (
    <motion.div
      className={`inline-block ${className}`}
      style={{ width: size, height: size }}
    >
      <motion.div
        className="w-full h-full border-4 border-transparent rounded-full"
        style={{
          borderTopColor: color,
          borderRightColor: color,
        }}
        animate={{ rotate: 360 }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
    </motion.div>
  )
}

// Pulse animation for notifications
export function PulseAnimation({
  children,
  scale = 1.05,
  duration = 2,
  className = '',
}: {
  children: ReactNode
  scale?: number
  duration?: number
  className?: string
}) {
  return (
    <motion.div
      animate={{
        scale: [1, scale, 1],
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
