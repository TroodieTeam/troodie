import { supabase } from '@/lib/supabase'
import * as ImagePicker from 'expo-image-picker'

export const storageService = {
  async uploadAvatar(userId: string, uri: string): Promise<string> {
    try {
      const ext = uri.split('.').pop() || 'jpg'
      const fileName = `${userId}/avatar-${Date.now()}.${ext}`
      
      // Convert URI to blob
      const response = await fetch(uri)
      const blob = await response.blob()
      
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, {
          contentType: `image/${ext}`,
          upsert: true
        })

      if (error) throw error
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)
      
      return publicUrl
    } catch (error) {
      console.error('Error uploading avatar:', error)
      throw error
    }
  },

  async uploadRestaurantPhoto(uri: string, userId: string): Promise<string> {
    try {
      const ext = uri.split('.').pop() || 'jpg'
      const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`
      
      // Convert URI to blob
      const response = await fetch(uri)
      const blob = await response.blob()
      
      const { data, error } = await supabase.storage
        .from('restaurant-photos')
        .upload(fileName, blob, {
          contentType: `image/${ext}`
        })

      if (error) throw error
      
      const { data: { publicUrl } } = supabase.storage
        .from('restaurant-photos')
        .getPublicUrl(fileName)
      
      return publicUrl
    } catch (error) {
      console.error('Error uploading restaurant photo:', error)
      throw error
    }
  },

  async uploadBoardCover(boardId: string, uri: string): Promise<string> {
    try {
      const ext = uri.split('.').pop() || 'jpg'
      const fileName = `${boardId}/cover-${Date.now()}.${ext}`
      
      // Convert URI to blob
      const response = await fetch(uri)
      const blob = await response.blob()
      
      const { data, error } = await supabase.storage
        .from('board-covers')
        .upload(fileName, blob, {
          contentType: `image/${ext}`,
          upsert: true
        })

      if (error) throw error
      
      const { data: { publicUrl } } = supabase.storage
        .from('board-covers')
        .getPublicUrl(fileName)
      
      return publicUrl
    } catch (error) {
      console.error('Error uploading board cover:', error)
      throw error
    }
  },

  async uploadCommunityImage(communityId: string, uri: string): Promise<string> {
    try {
      const ext = uri.split('.').pop() || 'jpg'
      const fileName = `${communityId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`
      
      // Convert URI to blob
      const response = await fetch(uri)
      const blob = await response.blob()
      
      const { data, error } = await supabase.storage
        .from('community-images')
        .upload(fileName, blob, {
          contentType: `image/${ext}`
        })

      if (error) throw error
      
      const { data: { publicUrl } } = supabase.storage
        .from('community-images')
        .getPublicUrl(fileName)
      
      return publicUrl
    } catch (error) {
      console.error('Error uploading community image:', error)
      throw error
    }
  },

  async uploadMultiplePhotos(uris: string[], userId: string, bucket: 'restaurant-photos' | 'community-images' = 'restaurant-photos'): Promise<string[]> {
    try {
      const uploadPromises = uris.map(uri => {
        if (bucket === 'restaurant-photos') {
          return this.uploadRestaurantPhoto(uri, userId)
        } else {
          // For community images, we need a community ID, so we'll use userId as folder
          return this.uploadCommunityImage(userId, uri)
        }
      })
      
      const urls = await Promise.all(uploadPromises)
      return urls
    } catch (error) {
      console.error('Error uploading multiple photos:', error)
      throw error
    }
  },

  async deleteFile(bucket: string, path: string): Promise<void> {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path])
      
      if (error) throw error
    } catch (error) {
      console.error('Error deleting file:', error)
      throw error
    }
  },

  async pickImage(options?: ImagePicker.ImagePickerOptions): Promise<string | null> {
    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    
    if (status !== 'granted') {
      alert('Sorry, we need camera roll permissions to upload photos!')
      return null
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: options?.aspect || [4, 3],
      quality: options?.quality || 0.8,
      ...options
    })

    if (!result.canceled && result.assets[0]) {
      return result.assets[0].uri
    }

    return null
  },

  async takePhoto(options?: ImagePicker.ImagePickerOptions): Promise<string | null> {
    // Request permissions
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    
    if (status !== 'granted') {
      alert('Sorry, we need camera permissions to take photos!')
      return null
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: options?.aspect || [4, 3],
      quality: options?.quality || 0.8,
      ...options
    })

    if (!result.canceled && result.assets[0]) {
      return result.assets[0].uri
    }

    return null
  },

  getPublicUrl(bucket: string, path: string): string {
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(path)
    
    return publicUrl
  }
}