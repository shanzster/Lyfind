'use client'

import { useEffect, useState } from 'react'
import { LostFoundItem, mockItems } from '@/lib/mock-data'

export function useItems() {
  const [items, setItems] = useState<LostFoundItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate API delay
    const timer = setTimeout(() => {
      setItems(mockItems)
      setLoading(false)
    }, 300)

    return () => clearTimeout(timer)
  }, [])

  const addItem = (item: Omit<LostFoundItem, 'id' | 'timestamp'>) => {
    const newItem: LostFoundItem = {
      ...item,
      id: Date.now().toString(),
      timestamp: Date.now(),
    }
    setItems([newItem, ...items])
    return newItem
  }

  const updateItem = (id: string, updates: Partial<LostFoundItem>) => {
    setItems(items.map((item) => (item.id === id ? { ...item, ...updates } : item)))
  }

  const deleteItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id))
  }

  const getItemById = (id: string) => {
    return items.find((item) => item.id === id)
  }

  const searchItems = (query: string, category?: string, type?: 'lost' | 'found') => {
    return items.filter((item) => {
      const matchesQuery =
        query === '' ||
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.description.toLowerCase().includes(query.toLowerCase()) ||
        item.location.toLowerCase().includes(query.toLowerCase())

      const matchesCategory = !category || item.category === category
      const matchesType = !type || item.type === type

      return matchesQuery && matchesCategory && matchesType
    })
  }

  return {
    items,
    loading,
    addItem,
    updateItem,
    deleteItem,
    getItemById,
    searchItems,
  }
}
