export interface LostFoundItem {
  id: string
  title: string
  description: string
  category: 'electronics' | 'accessories' | 'documents' | 'clothing' | 'other'
  type: 'lost' | 'found'
  status: 'active' | 'claimed' | 'resolved'
  image: string
  location: string
  date: string
  postedBy: string
  contact: string
  email?: string
  phone?: string
  timestamp: number
}

export interface Message {
  id: string
  senderId: string
  senderName: string
  recipientId: string
  itemId: string
  content: string
  timestamp: number
  read: boolean
}

export interface User {
  id: string
  name: string
  email: string
  phone?: string
  avatar: string
  joinDate: string
  itemsPosted: number
}

// Mock items data
export const mockItems: LostFoundItem[] = [
  {
    id: '1',
    title: 'Blue Backpack',
    description: 'Lost a blue Adidas backpack with laptop inside. Very important!',
    category: 'accessories',
    type: 'lost',
    status: 'active',
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop',
    location: 'Library, 3rd Floor',
    date: '2024-02-08',
    postedBy: 'Alex Johnson',
    contact: 'alex.johnson@school.edu',
    email: 'alex.johnson@school.edu',
    phone: '(555) 123-4567',
    timestamp: Date.now() - 86400000,
  },
  {
    id: '2',
    title: 'AirPods Pro',
    description: 'Found white AirPods Pro near the cafeteria. Contact me to claim.',
    category: 'electronics',
    type: 'found',
    status: 'active',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop',
    location: 'Cafeteria',
    date: '2024-02-07',
    postedBy: 'Sam Chen',
    contact: 'sam.chen@school.edu',
    email: 'sam.chen@school.edu',
    phone: '(555) 234-5678',
    timestamp: Date.now() - 172800000,
  },
  {
    id: '3',
    title: 'Student ID Card',
    description: 'Found a student ID card in the hallway. Name on card is visible.',
    category: 'documents',
    type: 'found',
    status: 'active',
    image: 'https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=400&h=400&fit=crop',
    location: 'Main Hallway',
    date: '2024-02-07',
    postedBy: 'Jordan Lee',
    contact: 'jordan.lee@school.edu',
    email: 'jordan.lee@school.edu',
    phone: '(555) 345-6789',
    timestamp: Date.now() - 259200000,
  },
  {
    id: '4',
    title: 'Black Winter Jacket',
    description: 'Lost my black winter jacket with a gold pin on the collar.',
    category: 'clothing',
    type: 'lost',
    status: 'active',
    image: 'https://images.unsplash.com/photo-1551028719-00167b16ebc5?w=400&h=400&fit=crop',
    location: 'Gym Locker Room',
    date: '2024-02-06',
    postedBy: 'Taylor Smith',
    contact: 'taylor.smith@school.edu',
    email: 'taylor.smith@school.edu',
    phone: '(555) 456-7890',
    timestamp: Date.now() - 345600000,
  },
  {
    id: '5',
    title: 'Silver Watch',
    description: 'Found a silver watch in the study area. No visible damage.',
    category: 'accessories',
    type: 'found',
    status: 'claimed',
    image: 'https://images.unsplash.com/photo-1523170335684-f042f1997c55?w=400&h=400&fit=crop',
    location: 'Study Area',
    date: '2024-02-05',
    postedBy: 'Morgan Davis',
    contact: 'morgan.davis@school.edu',
    email: 'morgan.davis@school.edu',
    phone: '(555) 567-8901',
    timestamp: Date.now() - 432000000,
  },
]

export const mockUsers: User[] = [
  {
    id: 'user1',
    name: 'Alex Johnson',
    email: 'alex.johnson@school.edu',
    phone: '(555) 123-4567',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
    joinDate: '2024-01-15',
    itemsPosted: 3,
  },
  {
    id: 'user2',
    name: 'Sam Chen',
    email: 'sam.chen@school.edu',
    phone: '(555) 234-5678',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    joinDate: '2024-01-20',
    itemsPosted: 2,
  },
]

export const mockMessages: Message[] = [
  {
    id: '1',
    senderId: 'user1',
    senderName: 'Alex Johnson',
    recipientId: 'user2',
    itemId: '1',
    content: 'Hi, I found something that might be yours. Can we chat?',
    timestamp: Date.now() - 3600000,
    read: true,
  },
  {
    id: '2',
    senderId: 'user2',
    senderName: 'Sam Chen',
    recipientId: 'user1',
    itemId: '1',
    content: 'That sounds great! What did you find?',
    timestamp: Date.now() - 1800000,
    read: true,
  },
]
