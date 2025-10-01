"use client"

import * as React from "react"
import { Controller, useForm, FieldPath, FieldValues } from "react-hook-form"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"

interface FormContextValue {
  register: any
  formState: any
  control: any
}

const FormContext = React.createContext<FormContextValue | null>(null)

export function Form({ children, ...props }: any) {
  return (
    <form {...props}>
      {children}
    </form>
  )
}

export function FormField<TFieldValues extends FieldValues = FieldValues>({
  control,
  name,
  render,
}: {
  control: any
  name: FieldPath<TFieldValues>
  render: ({ field }: { field: any }) => React.ReactElement
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => render({ field })}
    />
  )
}

export function FormItem({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("space-y-2", className)} {...props} />
  )
}

export function FormLabel({
  className,
  children,
  ...props
}: React.ComponentProps<typeof Label>) {
  return (
    <Label className={cn("text-sm font-medium", className)} {...props}>
      {children}
    </Label>
  )
}

export function FormControl({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("", className)} {...props} />
}

export function FormDescription({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("text-sm text-muted-foreground", className)} {...props}>
      {children}
    </div>
  )
}

export function FormMessage({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  if (!children) return null
  
  return (
    <div className={cn("text-sm text-destructive", className)} {...props}>
      {children}
    </div>
  )
}