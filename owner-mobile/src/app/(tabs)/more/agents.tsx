import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, TextInput, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../../context/ThemeContext';
import api from '../../../services/api';
import { showAlert } from '../../../utils/alerts';

type Agent = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  email?: string;
  phone_number?: string;
  is_owner?: boolean;
  is_delivery_partner?: boolean;
};

export default function AgentsScreen() {
  const { isDark, colors } = useAppTheme();
  
  const [activeTab, setActiveTab] = useState<'staff' | 'delivery'>('staff');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone_number: '',
    role: 'staff' as 'staff' | 'delivery'
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const res = await api.get('/auth/agents/');
      setAgents(res.data || []);
    } catch (e: any) {
      console.log('Failed to fetch agents:', e);
      showAlert('Error', 'Failed to load agents list.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAgent = async () => {
    if (!formData.name || !formData.email || !formData.phone_number) {
      showAlert('Error', 'Please fill in all required fields.');
      return;
    }
    
    setSubmitting(true);
    try {
      const nameParts = formData.name.split(' ');
      const first_name = nameParts[0];
      const last_name = nameParts.slice(1).join(' ');

      const payload = {
        first_name,
        last_name,
        email: formData.email,
        phone_number: formData.phone_number,
        role: formData.role
      };

      await api.post('/auth/agents/', payload);
      showAlert('Success', 'Agent added successfully.');
      setModalVisible(false);
      setFormData({ name: '', email: '', phone_number: '', role: 'staff' });
      fetchAgents();
    } catch (e: any) {
      console.log('Add agent error:', e);
      showAlert('Error', e?.response?.data?.error || 'Failed to add agent.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAgent = async (id: number) => {
    try {
      await api.delete(`/auth/agents/${id}/`);
      showAlert('Success', 'Agent removed successfully.');
      setAgents(prev => prev.filter(a => a.id !== id));
    } catch (e: any) {
      console.log('Delete agent error:', e);
      showAlert('Error', e?.response?.data?.error || 'Failed to remove agent.');
    }
  };

  const filteredAgents = agents.filter(agent => {
    if (activeTab === 'staff') {
      return agent.is_owner === true;
    } else {
      return agent.is_delivery_partner === true;
    }
  });

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#020617' : '#f8fafc' }]}>
      {/* Top Tabs */}
      <View style={[styles.tabContainer, { backgroundColor: isDark ? '#0f172a' : '#ffffff', borderColor: isDark ? '#1e293b' : '#e2e8f0' }]}>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'staff' && [styles.activeTab, { backgroundColor: colors.primary + '20' }]]} 
          onPress={() => setActiveTab('staff')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'staff' ? colors.primary : colors.textMuted }]}>
            Store Staff
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'delivery' && [styles.activeTab, { backgroundColor: colors.primary + '20' }]]} 
          onPress={() => setActiveTab('delivery')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'delivery' ? colors.primary : colors.textMuted }]}>
            Delivery Fleet
          </Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      <ScrollView contentContainerStyle={styles.listContainer}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
        ) : filteredAgents.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No {activeTab === 'staff' ? 'store staff' : 'delivery partners'} found.</Text>
          </View>
        ) : (
          filteredAgents.map(agent => (
            <View key={agent.id} style={[styles.agentCard, { backgroundColor: isDark ? '#0f172a' : '#ffffff', borderColor: isDark ? '#1e293b' : '#e2e8f0' }]}>
              <View style={styles.agentInfo}>
                <Text style={[styles.agentName, { color: colors.text }]}>
                  {agent.first_name || agent.username || 'No Name'} {agent.last_name || ''}
                </Text>
                <Text style={[styles.agentDetail, { color: colors.textMuted }]}>
                  <Ionicons name="mail-outline" size={14} /> {agent.email || 'No Email'}
                </Text>
                {!!agent.phone_number && (
                  <Text style={[styles.agentDetail, { color: colors.textMuted }]}>
                    <Ionicons name="call-outline" size={14} /> {agent.phone_number}
                  </Text>
                )}
                <View style={[styles.roleBadge, { backgroundColor: agent.is_owner ? '#8b5cf620' : '#05966920' }]}>
                  <Text style={[styles.roleText, { color: agent.is_owner ? '#8b5cf6' : '#059669' }]}>
                    {agent.is_owner ? 'Store Staff' : 'Delivery Partner'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteAgent(agent.id)}>
                <Ionicons name="trash-outline" size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {/* Floating Add Button */}
      <TouchableOpacity 
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="add" size={24} color="#fff" />
        <Text style={styles.fabText}>Add Agent</Text>
      </TouchableOpacity>

      {/* Add Agent Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#0f172a' : '#ffffff' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Add New Agent</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.label, { color: colors.text }]}>Full Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9', color: colors.text }]}
              placeholder="e.g. John Doe"
              placeholderTextColor={colors.textMuted}
              value={formData.name}
              onChangeText={t => setFormData({ ...formData, name: t })}
            />

            <Text style={[styles.label, { color: colors.text }]}>Email Address</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9', color: colors.text }]}
              placeholder="e.g. john@example.com"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              value={formData.email}
              onChangeText={t => setFormData({ ...formData, email: t })}
            />

            <Text style={[styles.label, { color: colors.text }]}>Phone Number</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9', color: colors.text }]}
              placeholder="e.g. +919876543210"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
              value={formData.phone_number}
              onChangeText={t => setFormData({ ...formData, phone_number: t })}
            />

            <Text style={[styles.label, { color: colors.text }]}>Role</Text>
            <View style={styles.roleSelector}>
              <TouchableOpacity 
                style={[styles.roleOption, formData.role === 'staff' && [styles.activeRoleOption, { backgroundColor: '#8b5cf620', borderColor: '#8b5cf6' }]]}
                onPress={() => setFormData({ ...formData, role: 'staff' })}
              >
                <Text style={{ color: formData.role === 'staff' ? '#8b5cf6' : colors.textMuted, fontWeight: '600' }}>Store Staff</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.roleOption, formData.role === 'delivery' && [styles.activeRoleOption, { backgroundColor: '#05966920', borderColor: '#059669' }]]}
                onPress={() => setFormData({ ...formData, role: 'delivery' })}
              >
                <Text style={{ color: formData.role === 'delivery' ? '#059669' : colors.textMuted, fontWeight: '600' }}>Delivery Fleet</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={[styles.submitBtn, { backgroundColor: colors.primary }]}
              onPress={handleAddAgent}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>Create Agent</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabContainer: {
    flexDirection: 'row',
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden'
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: 'transparent'
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700'
  },
  listContainer: {
    padding: 16,
    paddingBottom: 100
  },
  agentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12
  },
  agentInfo: {
    flex: 1,
    gap: 4
  },
  agentName: {
    fontSize: 16,
    fontWeight: '700'
  },
  agentDetail: {
    fontSize: 13,
    marginTop: 2
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 6
  },
  roleText: {
    fontSize: 11,
    fontWeight: '700'
  },
  deleteBtn: {
    padding: 10,
    backgroundColor: '#ef444420',
    borderRadius: 12
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60
  },
  emptyText: {
    marginTop: 12,
    fontSize: 15
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 30,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4
  },
  fabText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    minHeight: '60%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800'
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16
  },
  input: {
    height: 50,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15
  },
  roleSelector: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8
  },
  roleOption: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    backgroundColor: 'rgba(150,150,150,0.1)'
  },
  activeRoleOption: {
    borderWidth: 1
  },
  submitBtn: {
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
    marginBottom: 20
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700'
  }
});
