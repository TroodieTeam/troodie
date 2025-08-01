import React, { useState } from 'react'
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native'
import { X } from 'lucide-react-native'
import { designTokens } from '../../constants/designTokens'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

interface ReasonModalProps {
  visible: boolean
  onClose: () => void
  onSubmit: (reason: string) => void
  title: string
  placeholder?: string
  submitText?: string
  requireReason?: boolean
}

export const ReasonModal: React.FC<ReasonModalProps> = ({
  visible,
  onClose,
  onSubmit,
  title,
  placeholder = 'Enter reason (optional)',
  submitText = 'Submit',
  requireReason = false
}) => {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = () => {
    if (requireReason && !reason.trim()) {
      setError('Please provide a reason')
      return
    }
    
    onSubmit(reason.trim())
    handleClose()
  }

  const handleClose = () => {
    setReason('')
    setError('')
    onClose()
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoid}
          >
            <View style={styles.modal}>
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.title}>{title}</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={handleClose}
                >
                  <X size={20} color={designTokens.colors.text} />
                </TouchableOpacity>
              </View>

              {/* Input */}
              <View style={styles.content}>
                <TextInput
                  style={[styles.input, error ? styles.inputError : null]}
                  placeholder={placeholder}
                  placeholderTextColor="#999"
                  value={reason}
                  onChangeText={(text) => {
                    setReason(text)
                    if (error) setError('')
                  }}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  maxLength={500}
                />
                
                {error ? (
                  <Text style={styles.errorText}>{error}</Text>
                ) : (
                  <Text style={styles.charCount}>{reason.length}/500</Text>
                )}
              </View>

              {/* Actions */}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={handleClose}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.submitButton,
                    (!reason.trim() && requireReason) && styles.submitButtonDisabled
                  ]}
                  onPress={handleSubmit}
                  disabled={!reason.trim() && requireReason}
                >
                  <Text style={styles.submitText}>{submitText}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardAvoid: {
    width: '100%',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: SCREEN_WIDTH - 40,
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: designTokens.colors.textDark,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: designTokens.colors.textDark,
    minHeight: 100,
    backgroundColor: '#F8F8F8',
  },
  inputError: {
    borderColor: '#FF4444',
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#FF4444',
    marginTop: 8,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F0F0F0',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  submitButton: {
    backgroundColor: designTokens.colors.primaryOrange,
  },
  submitButtonDisabled: {
    backgroundColor: '#FFD4C4',
  },
  submitText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
})