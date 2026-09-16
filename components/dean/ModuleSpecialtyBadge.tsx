'use client'

import React, { useState } from 'react'
import { getModuleVisual, ModuleVisual } from '@/utils/getModuleIcon'

interface ModuleSpecialtyBadgeProps {
  moduleName: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
  showSpecialtySubtitle?: boolean
}

export function ModuleSpecialtyBadge({
  moduleName,
  size = 'md',
  className = '',
}: ModuleSpecialtyBadgeProps) {
  const [imgFailed, setImgFailed] = useState(false)
  const visual: ModuleVisual = getModuleVisual(moduleName)
  const FallbackIcon = visual.fallbackIcon

  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-12 h-12',
    lg: 'w-14 h-14',
  }[size]

  const iconSizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-9 h-9',
  }[size]

  const lucideSizeClasses = {
    sm: 'size-5',
    md: 'size-6',
    lg: 'size-7',
  }[size]

  return (
    <div
      className={`relative ${sizeClasses} rounded-xl flex items-center justify-center p-2 border transition-all duration-200 group-hover:scale-105 shrink-0 ${visual.bgColor} ${visual.borderColor} ${visual.gradientBg} shadow-2xs ${className}`}
      title={`${moduleName} — ${visual.specialty}`}
    >
      {!imgFailed && visual.iconPath ? (
        <img
          src={visual.iconPath}
          alt={moduleName}
          onError={() => setImgFailed(true)}
          className={`${iconSizeClasses} object-contain transition-transform duration-200 group-hover:scale-110 group-hover:animate-pulse`}
          loading="lazy"
        />
      ) : (
        <FallbackIcon
          className={`${lucideSizeClasses} ${visual.textColor} transition-transform duration-200 group-hover:scale-110 group-hover:animate-pulse`}
        />
      )}
    </div>
  )
}
