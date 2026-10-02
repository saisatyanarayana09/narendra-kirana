import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '../utils/cropImage';

export default function WebCropper({ imageSrc, onCropComplete, onCancel }: any) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const onCropCompleteAction = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const showCroppedImage = useCallback(async () => {
    try {
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
      onCropComplete(croppedImage);
    } catch (e) {
      console.error(e);
      onCancel();
    }
  }, [imageSrc, croppedAreaPixels, onCropComplete]);

  if (!imageSrc) return null;

  return (
    <Modal visible={true} transparent={true} animationType="fade">
      <View style={styles.container}>
        <View style={styles.cropperContainer}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            onCropChange={setCrop}
            onCropComplete={onCropCompleteAction}
            onZoomChange={setZoom}
          />
        </View>
        <View style={styles.footer}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
            <Text style={styles.btnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveBtn} onPress={showCroppedImage}>
            <Text style={styles.btnTextSave}>Save Crop</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  cropperContainer: { flex: 1, position: 'relative' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, backgroundColor: '#111' },
  cancelBtn: { padding: 10 },
  saveBtn: { padding: 10, backgroundColor: '#10b981', borderRadius: 8 },
  btnText: { color: '#fff', fontSize: 16 },
  btnTextSave: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
