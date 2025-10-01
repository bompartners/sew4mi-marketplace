"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface AlertDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

export function AlertDialog({ open, onOpenChange, children }: AlertDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children}
    </Dialog>
  )
}

export function AlertDialogTrigger({ 
  children, 
  asChild = false,
  ...props 
}: React.HTMLAttributes<HTMLElement> & { asChild?: boolean }) {
  if (asChild) {
    return React.cloneElement(children as React.ReactElement, props)
  }
  return <div {...props}>{children}</div>
}

export function AlertDialogContent({ 
  className, 
  children, 
  ...props 
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <DialogContent className={cn("sm:max-w-lg", className)} {...props}>
      {children}
    </DialogContent>
  )
}

export function AlertDialogHeader({ 
  className, 
  children, 
  ...props 
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <DialogHeader className={className} {...props}>
      {children}
    </DialogHeader>
  )
}

export function AlertDialogTitle({ 
  className, 
  children, 
  ...props 
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <DialogTitle className={className} {...props}>
      {children}
    </DialogTitle>
  )
}

export function AlertDialogDescription({ 
  className, 
  children, 
  ...props 
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm text-muted-foreground", className)} {...props}>
      {children}
    </p>
  )
}

export function AlertDialogFooter({ 
  className, 
  children, 
  ...props 
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props}>
      {children}
    </div>
  )
}

export function AlertDialogAction({ 
  className, 
  children,
  onClick,
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <Button className={className} onClick={onClick} {...props}>
      {children}
    </Button>
  )
}

export function AlertDialogCancel({ 
  className, 
  children,
  onClick,
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <Button variant="outline" className={className} onClick={onClick} {...props}>
      {children}
    </Button>
  )
}