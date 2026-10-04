import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView } from 'react-native';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '../utils/cropImage';

export default function WebCropper({ imageSrc, initialAspect = 1, onCropComplete, onCancel }: any) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [selectedAspect, setSelectedAspect] = useState<number | undefined>(initialAspect);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const onCropCompleteAction = useCallback((_croppedArea: any, pixels: any) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const showCroppedImage = useCallback(async () => {
    try {
      if (!croppedAreaPixels) return;
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
      onCropComplete(croppedImage);
    } catch (e) {
      console.error(e);
      onCancel();
    }
  }, [imageSrc, croppedAreaPixels, onCropComplete, onCancel]);

  if (!imageSrc) return null;

  const aspectOptions = [
    { label: '1:1', val: 1 },
    { label: '4:3', val: 4 / 3 },
    { label: '3:4', val: 3 / 4 },
    { label: '16:9', val: 16 / 9 },
    { label: 'Free', val: undefined },
  ];

  return (
    <Modal visible={true} transparent={true} animationType="fade">
      <View style={styles.container}>
        {/* Aspect Ratio Toolbar */}
        <View style={styles.ratioBar}>
          <Text style={styles.ratioTitle}>Ratio:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.ratioScroll}>
            {aspectOptions.map((opt, idx) => {
              const active =
                (selectedAspect === undefined && opt.val === undefined) ||
                (selectedAspect !== undefined && opt.val !== undefined && Math.abs(selectedAspect - opt.val) < 0.01);
              return (
                <TouchableOpacity
                  key={idx}
                  style={[styles.ratioBtn, active && styles.ratioBtnActive]}
                  onPress={() => setSelectedAspect(opt.val)}
                >
                  <Text style={[styles.ratioBtnText, active && styles.ratioBtnTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.cropperContainer}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={selectedAspect}
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
            <Text style={styles.btnTextSave}>Apply & Compress</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#090d16' },
  ratioBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  ratioTitle: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
    marginRight: 8,
  },
  ratioScroll: {
    flexDirection: 'row',
    gap: 8,
  },
  ratioBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  ratioBtnActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  ratioBtnText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
  },
  ratioBtnTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  cropperContainer: { flex: 1, position: 'relative' },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#0f172a',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 10 },
  saveBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: '#10b981',
    borderRadius: 10,
  },
  btnText: { color: '#94a3b8', fontSize: 14, fontWeight: '600' },
  btnTextSave: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
});
