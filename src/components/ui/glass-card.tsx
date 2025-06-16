/**
 * Enhanced Glassmorphism Card Components for WeAnime
 * 
 * Provides beautiful glass-effect cards with anime-themed styling
 */

import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

// Glass card variants with 3D/4D enhancements
type GlassVariant = 
  | 'default'      // Standard glass effect
  | 'anime'        // Anime-themed deep purple gradient
  | 'premium'      // Premium purple-pink gradient  
  | 'hero'         // Large hero section glass
  | 'modal'        // Modal overlay glass
  | 'navigation'   // Navigation bar glass
  | 'player'       // Video player controls glass
  | '3d'           // 3D transform effects
  | '4d'           // 4D with advanced lighting

// Glass intensity levels with dimensional effects
type GlassIntensity = 'light' | 'medium' | 'heavy' | 'dimensional'

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: GlassVariant
  intensity?: GlassIntensity
  children: React.ReactNode
  hover?: boolean
  glow?: boolean
  animated?: boolean
}

const glassVariants = {
  default: {
    light: "bg-white/5 backdrop-blur-sm border-white/10",
    medium: "bg-white/10 backdrop-blur-md border-white/20", 
    heavy: "bg-white/15 backdrop-blur-lg border-white/30",
    dimensional: "bg-white/20 backdrop-blur-xl border-white/40"
  },
  anime: {
    light: "bg-gradient-to-br from-purple-500/8 to-violet-600/6 backdrop-blur-md border-purple-400/15",
    medium: "bg-gradient-to-br from-purple-500/12 to-violet-600/10 backdrop-blur-lg border-purple-400/25",
    heavy: "bg-gradient-to-br from-purple-500/18 to-violet-600/15 backdrop-blur-xl border-purple-400/35",
    dimensional: "bg-gradient-to-br from-purple-500/25 to-violet-600/20 backdrop-blur-2xl border-purple-400/45"
  },
  premium: {
    light: "bg-gradient-to-br from-purple-600/8 to-pink-500/6 backdrop-blur-md border-purple-300/15",
    medium: "bg-gradient-to-br from-purple-600/12 to-pink-500/10 backdrop-blur-lg border-purple-300/25",
    heavy: "bg-gradient-to-br from-purple-600/18 to-pink-500/15 backdrop-blur-xl border-purple-300/35",
    dimensional: "bg-gradient-to-br from-purple-600/25 to-pink-500/20 backdrop-blur-2xl border-purple-300/45"
  },
  '3d': {
    light: "bg-gradient-to-br from-violet-500/8 to-purple-600/6 backdrop-blur-md border-violet-400/15 glass-3d",
    medium: "bg-gradient-to-br from-violet-500/12 to-purple-600/10 backdrop-blur-lg border-violet-400/25 glass-3d",
    heavy: "bg-gradient-to-br from-violet-500/18 to-purple-600/15 backdrop-blur-xl border-violet-400/35 glass-3d",
    dimensional: "bg-gradient-to-br from-violet-500/25 to-purple-600/20 backdrop-blur-2xl border-violet-400/45 glass-3d"
  },
  '4d': {
    light: "bg-gradient-to-br from-indigo-500/8 to-purple-600/6 backdrop-blur-lg border-indigo-400/15 glass-4d",
    medium: "bg-gradient-to-br from-indigo-500/12 to-purple-600/10 backdrop-blur-xl border-indigo-400/25 glass-4d",
    heavy: "bg-gradient-to-br from-indigo-500/18 to-purple-600/15 backdrop-blur-2xl border-indigo-400/35 glass-4d",
    dimensional: "bg-gradient-to-br from-indigo-500/25 to-purple-600/20 backdrop-blur-3xl border-indigo-400/45 glass-4d"
  },
  hero: {
    light: "bg-gradient-to-br from-slate-900/20 to-slate-800/20 backdrop-blur-sm border-slate-600/10",
    medium: "bg-gradient-to-br from-slate-900/30 to-slate-800/30 backdrop-blur-md border-slate-600/20",
    heavy: "bg-gradient-to-br from-slate-900/40 to-slate-800/40 backdrop-blur-lg border-slate-600/30",
    dimensional: "bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-2xl border-slate-600/40"
  },
  modal: {
    light: "bg-black/20 backdrop-blur-sm border-white/5",
    medium: "bg-black/30 backdrop-blur-md border-white/10",
    heavy: "bg-black/40 backdrop-blur-lg border-white/15",
    dimensional: "bg-black/50 backdrop-blur-2xl border-white/20"
  },
  navigation: {
    light: "bg-white/5 backdrop-blur-md border-b border-white/10",
    medium: "bg-white/8 backdrop-blur-lg border-b border-white/15",
    heavy: "bg-white/12 backdrop-blur-xl border-b border-white/20",
    dimensional: "bg-white/15 backdrop-blur-2xl border-b border-white/25"
  },
  player: {
    light: "bg-black/30 backdrop-blur-sm border-white/5",
    medium: "bg-black/40 backdrop-blur-md border-white/10",
    heavy: "bg-black/50 backdrop-blur-lg border-white/15",
    dimensional: "bg-black/60 backdrop-blur-2xl border-white/20"
  }
}

const hoverEffects = {
  default: "hover:bg-white/15 hover:border-white/25",
  anime: "hover:bg-gradient-to-br hover:from-purple-500/20 hover:to-violet-600/15 hover:border-purple-400/30",
  premium: "hover:bg-gradient-to-br hover:from-purple-600/20 hover:to-pink-500/15 hover:border-purple-300/30",
  '3d': "hover:bg-gradient-to-br hover:from-violet-500/20 hover:to-purple-600/15 hover:border-violet-400/30",
  '4d': "hover:bg-gradient-to-br hover:from-indigo-500/20 hover:to-purple-600/15 hover:border-indigo-400/30",
  hero: "hover:bg-gradient-to-br hover:from-slate-900/35 hover:to-slate-800/35 hover:border-slate-600/25",
  modal: "hover:bg-black/35 hover:border-white/15",
  navigation: "hover:bg-white/10 hover:border-white/20",
  player: "hover:bg-black/45 hover:border-white/15"
}

const glowEffects = {
  default: "shadow-lg shadow-white/10",
  anime: "shadow-xl shadow-purple-500/25",
  premium: "shadow-xl shadow-purple-600/25",
  '3d': "shadow-xl shadow-violet-500/25",
  '4d': "shadow-2xl shadow-indigo-500/30",
  hero: "shadow-2xl shadow-slate-900/30",
  modal: "shadow-2xl shadow-black/40",
  navigation: "shadow-lg shadow-white/5",
  player: "shadow-xl shadow-black/30"
}

export const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ 
    className, 
    variant = 'default', 
    intensity = 'medium', 
    hover = true, 
    glow = false,
    animated = true,
    children, 
    ...props 
  }, ref) => {
    const baseClasses = "rounded-xl border transition-all duration-300"
    const glassClasses = glassVariants[variant][intensity]
    const hoverClasses = hover ? hoverEffects[variant] : ""
    const glowClasses = glow ? glowEffects[variant] : ""
    
    if (animated) {
      return (
        <motion.div
          ref={ref}
          className={cn(
            baseClasses,
            glassClasses,
            hoverClasses,
            glowClasses,
            className
          )}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          whileHover={hover ? { 
            scale: 1.02, 
            transition: { duration: 0.2 } 
          } : undefined}
        >
          {children}
        </motion.div>
      )
    }
    
    return (
      <div
        ref={ref}
        className={cn(
          baseClasses,
          glassClasses,
          hoverClasses,
          glowClasses,
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
GlassCard.displayName = "GlassCard"

// Glass header component
export const GlassHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
GlassHeader.displayName = "GlassHeader"

// Glass content component
export const GlassContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
GlassContent.displayName = "GlassContent"

// Glass footer component
export const GlassFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
GlassFooter.displayName = "GlassFooter"

// Specialized glass components
export const GlassButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: GlassVariant
    size?: 'sm' | 'md' | 'lg'
  }
>(({ className, variant = 'default', size = 'md', ...props }, ref) => (
  <motion.button
    ref={ref}
    className={cn(
      "rounded-lg border font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2",
      size === 'sm' && "px-3 py-1.5 text-sm",
      size === 'md' && "px-4 py-2 text-sm", 
      size === 'lg' && "px-6 py-3 text-base",
      glassVariants[variant].medium,
      hoverEffects[variant],
      "focus:ring-offset-transparent focus:ring-white/20",
      className
    )}
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
  />
))
GlassButton.displayName = "GlassButton"

export const GlassModal = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    isOpen: boolean
    onClose?: () => void
  }
>(({ className, isOpen, onClose, children, ...restProps }, ref) => {
  if (!isOpen) return null
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      
      {/* Modal */}
      <motion.div
        ref={ref}
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className={cn(
          "relative max-w-lg w-full max-h-[90vh] overflow-auto rounded-xl",
          glassVariants.modal.heavy,
          "border-white/20 shadow-2xl",
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </motion.div>
    </motion.div>
  )
})
GlassModal.displayName = "GlassModal"

export const GlassNavigation = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement>
>(({ className, ...props }, ref) => (
  <nav
    ref={ref}
    className={cn(
      "sticky top-0 z-40 w-full",
      glassVariants.navigation.medium,
      className
    )}
    {...props}
  />
))
GlassNavigation.displayName = "GlassNavigation"