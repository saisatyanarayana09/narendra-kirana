import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Check, X, GripVertical } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import toast from 'react-hot-toast';
import api from '../../services/api';
import ImageCropper from '../components/ImageCropper';

const Categories = () => {
 const [categories, setCategories] = useState([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState(null);
 
 // Form state
 const [isFormOpen, setIsFormOpen] = useState(false);
 const [editingId, setEditingId] = useState(null);
 const [formData, setFormData] = useState({ name: '', is_active: true });
 const [imageFile, setImageFile] = useState(null);

 const fetchCategories = async () => {
 try {
 setLoading(true);
 const response = await api.get('/categories/');
 // Assuming DRF pagination is active, data might be in response.data.results
 setCategories(response.data.results || response.data);
 setError(null);
 } catch (err) {
 setError('Failed to fetch categories.');
 console.error(err);
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 fetchCategories();
 }, []);

 const openForm = (category = null) => {
 if (category) {
 setEditingId(category.id);
 setFormData({ name: category.name, is_active: category.is_active });
 } else {
 setEditingId(null);
 setFormData({ name: '', is_active: true });
 }
 setImageFile(null);
 setIsFormOpen(true);
 };

 const closeForm = () => {
 setIsFormOpen(false);
 setEditingId(null);
 setFormData({ name: '', is_active: true });
 setImageFile(null);
 };

 const handleSubmit = async (e) => {
 e.preventDefault();
 try {
 const payload = new FormData();
 payload.append('name', formData.name);
 payload.append('is_active', formData.is_active);
      if (imageFile) {
        payload.append('image', imageFile, imageFile.name);
      }
 
      const savePromise = editingId 
        ? api.put(`/categories/${editingId}/`, payload)
        : api.post('/categories/', payload);

      toast.promise(savePromise, {
        loading: imageFile ? 'Uploading...' : 'Saving...',
        success: editingId ? 'Category updated!' : 'Category created!',
        error: 'Failed to save category. Ensure name is unique.'
      });

      await savePromise;
      closeForm();
      fetchCategories();
    } catch (err) {
      console.error(err);
    }
 };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      try {
        await api.delete(`/categories/${id}/`);
        toast.success('Category deleted');
        fetchCategories();
      } catch (err) {
        toast.error('Failed to delete category. It might be linked to products.');
        console.error(err);
      }
    }
  };

  const onDragEnd = async (result) => {
    if (!result.destination) return;
    const items = Array.from(categories);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setCategories(items);

    const updates = items.map((item, index) => ({
      id: item.id,
      display_order: index
    }));

    try {
      await api.post('/categories/reorder/', updates);
      toast.success('Order updated instantly', { position: 'bottom-right', id: 'reorder-toast' });
    } catch (error) {
      toast.error('Failed to save order');
      fetchCategories();
    }
  };

 if (loading && categories.length === 0) return <div className="p-4">Loading categories...</div>;

 return (
 <div className="max-w-5xl mx-auto space-y-6">
 <div className="flex justify-between items-center">
 <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
 <button 
 onClick={() => openForm()}
 className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition"
 >
 <Plus className="w-5 h-5 mr-2"/>
 Add Category
 </button>
 </div>

 {error && <div className="p-4 bg-red-100 text-red-700 rounded-xl">{error}</div>}

 {/* Form Modal */}
 {isFormOpen && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
 <div className="bg-white rounded-2xl w-full max-w-md p-6 sm:p-8 shadow-2xl border border-slate-100">
 <div className="flex justify-between items-center mb-6">
 <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">{editingId ? 'Edit Category' : 'New Category'}</h2>
 <button onClick={closeForm} className="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-50 rounded-full">
 <X className="w-6 h-6"/>
 </button>
 </div>
 
 <form onSubmit={handleSubmit} className="space-y-5">
 <div>
 <label className="block text-sm font-bold text-slate-700 mb-1.5">Name</label>
 <input
 type="text"
 required
 value={formData.name}
 onChange={(e) => setFormData({...formData, name: e.target.value})}
 className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
 placeholder="e.g. Rice & Grains"
 />
 </div>

 <div>
    <label className="block text-sm font-bold text-slate-700 mb-1.5">Category Image</label>
    <ImageCropper 
      aspect={1}
      label="Upload Photo"
      currentImageUrl={
        imageFile && (imageFile instanceof File || imageFile instanceof Blob) 
          ? URL.createObjectURL(imageFile) 
          : editingId && categories.find(c => c.id === editingId)?.image 
            ? categories.find(c => c.id === editingId).image 
            : null
      }
      onCropComplete={(file) => setImageFile(file)}
    />
 <p className="text-xs text-slate-500 mt-1">Optional. Will be displayed instead of the first letter.</p>
 </div>
 
 <div className="flex items-center pt-1">
 <input
 type="checkbox"
 id="isActive"
 checked={formData.is_active}
 onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
 className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
 />
 <label htmlFor="isActive"className="ml-2 block text-sm font-medium text-slate-700">
 Active (visible to customers)
 </label>
 </div>

 <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-6">
 <button
 type="button"
 onClick={closeForm}
 className="px-5 py-2.5 text-slate-600 font-bold bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="px-5 py-2.5 text-white font-bold bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
 >
 Save Category
 </button>
 </div>
 </form>
 </div>
 </div>
 )}

 {/* Categories Table */}
 <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
 <div className="overflow-x-auto">
 <table className="min-w-full divide-y divide-slate-100">
 <thead className="bg-slate-50">
 <tr>
        <th className="px-6 py-4 w-12"></th>
        <th className="px-6 py-4 text-left text-xs font-extrabold text-slate-500 uppercase tracking-widest">Name</th>
        <th className="px-6 py-4 text-left text-xs font-extrabold text-slate-500 uppercase tracking-widest">Status</th>
        <th className="px-6 py-4 text-right text-xs font-extrabold text-slate-500 uppercase tracking-widest">Actions</th>
      </tr>
    </thead>
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="categories">
        {(provided) => (
          <tbody 
            className="bg-white divide-y divide-slate-50"
            {...provided.droppableProps}
            ref={provided.innerRef}
          >
            {categories.map((category, index) => (
              <Draggable key={category.id} draggableId={category.id.toString()} index={index}>
                {(provided, snapshot) => (
                  <tr 
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    className={`hover:bg-slate-50 transition-colors group ${snapshot.isDragging ? 'bg-indigo-50 shadow-lg ring-1 ring-indigo-500 z-10' : ''}`}
                    style={provided.draggableProps.style}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-slate-400">
                      <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-slate-200">
                        <GripVertical className="w-5 h-5" />
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">{category.name}</div>
                      <div className="text-xs font-medium text-slate-500">Slug: {category.slug}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-0.5 inline-flex text-[10px] uppercase tracking-wider font-extrabold rounded-md ${
                        category.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700 '
                      }`}>
                        {category.is_active ? 'Active' : 'Hidden'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button 
                        onClick={() => openForm(category)}
                        className="p-2 text-indigo-600 hover:text-white bg-indigo-50 hover:bg-indigo-600 rounded-xl transition-colors inline-flex items-center"
                      >
                        <Edit2 className="w-4 h-4"/>
                      </button>
                      <button 
                        onClick={() => handleDelete(category.id)}
                        className="p-2 text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 rounded-xl transition-colors inline-flex items-center"
                      >
                        <Trash2 className="w-4 h-4"/>
                      </button>
                    </td>
                  </tr>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
            {categories.length === 0 && (
              <tr>
                <td colSpan="4" className="px-6 py-12 text-center">
                  <p className="text-slate-500 font-medium">No categories found. Click "Add Category" to create one.</p>
                </td>
              </tr>
            )}
          </tbody>
        )}
      </Droppable>
    </DragDropContext>
  </table>
 </div>
 </div>
 </div>
 );
};

export default Categories;
