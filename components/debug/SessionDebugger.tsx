import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { useAuth } from '@/contexts/AuthContext'
import { debugStorage } from '@/utils/debugStorage'
import { sessionPersistence } from '@/utils/sessionPersistence'
import { supabase } from '@/lib/supabase'

export function SessionDebugger() {
  const { user, session, isAuthenticated } = useAuth()
  
  const handleDebugStorage = async () => {
    console.log('=== SESSION DEBUG START ===')
    await debugStorage.logAllStorage()
    await debugStorage.getSupabaseSession()
    console.log('=== SESSION DEBUG END ===')
  }
  
  const handleForceRefresh = async () => {
    console.log('Forcing session refresh...')
    const newSession = await sessionPersistence.forceRefreshSession()
    console.log('Force refresh result:', newSession ? 'Success' : 'Failed')
  }
  
  const handleManualRestore = async () => {
    console.log('Attempting manual session restore...')
    const restoredSession = await sessionPersistence.restoreSession()
    console.log('Manual restore result:', restoredSession ? 'Success' : 'Failed')
  }
  
  const handleGetSession = async () => {
    console.log('Getting session via Supabase...')
    const { data: { session }, error } = await supabase.auth.getSession()
    console.log('getSession result:', {
      hasSession: !!session,
      error: error?.message,
      userId: session?.user?.id,
      expiresAt: session?.expires_at
    })
  }
  
  if (!__DEV__) return null
  
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Session Debug Info</Text>
      
      <View style={styles.section}>
        <Text style={styles.label}>Auth Status:</Text>
        <Text style={styles.value}>{isAuthenticated ? 'Authenticated' : 'Not Authenticated'}</Text>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.label}>User ID:</Text>
        <Text style={styles.value}>{user?.id || 'None'}</Text>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.label}>Email:</Text>
        <Text style={styles.value}>{user?.email || 'None'}</Text>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.label}>Session Expires:</Text>
        <Text style={styles.value}>
          {session?.expires_at ? new Date(session.expires_at).toLocaleString() : 'N/A'}
        </Text>
      </View>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={handleDebugStorage}>
          <Text style={styles.buttonText}>Debug Storage</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={handleGetSession}>
          <Text style={styles.buttonText}>Get Session</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={handleForceRefresh}>
          <Text style={styles.buttonText}>Force Refresh</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={handleManualRestore}>
          <Text style={styles.buttonText}>Manual Restore</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    margin: 10,
    borderRadius: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  section: {
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  value: {
    fontSize: 14,
    color: '#333',
  },
  buttonContainer: {
    marginTop: 15,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 5,
    marginBottom: 5,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
  },
})