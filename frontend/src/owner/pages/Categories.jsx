import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Edit2, Trash2, Check, X, GripVertical, Search } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import toast from 'react-hot-toast';
import api from '../../services/api';
import ImageCropper from '../components/ImageCropper';

const Categories = () => {
 const [categories, setCategories] = useState([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState(null);
 const [searchTerm, setSearchTerm] = useState('');
 
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
        ? api.patch(`/categories/${editingId}/`, payload)
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

  const filteredCategories = categories.filter(c =>
    !searchTerm || c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && categories.length === 0) {
    return (
      <div className="max-w-5xl mx-auto py-12 text-center text-slate-500 dark:text-slate-400 font-medium">
        Loading categories...
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Categories</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {categories.length}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Organize store catalog sections</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search categories..."
              aria-label="Search categories"
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-[#0d1322] border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-sm"
            />
          </div>

          <button 
            onClick={() => openForm()}
            className="flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm whitespace-nowrap"
          >
            <Plus className="w-4 h-4 mr-1.5"/>
            Add Category
          </button>
        </div>
      </div>

      {error && <div className="p-4 bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300 rounded-xl text-sm font-medium">{error}</div>}

      {/* Form Modal */}
      {isFormOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0d1322] rounded-2xl w-full max-w-md p-6 sm:p-8 shadow-2xl border border-slate-100 dark:border-slate-800 transition-colors">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">{editingId ? 'Edit Category' : 'New Category'}</h2>
              <button 
                onClick={closeForm} 
                aria-label="Close modal"
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full"
              >
                <X className="w-5 h-5"/>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="cat-name" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Name</label>
                <input
                  id="cat-name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-sm"
                  placeholder="e.g. Rice & Grains"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Category Image</label>
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
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Optional. Displayed in customer app and website navigation.</p>
              </div>
              
              <div className="flex items-center pt-1">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                  className="w-5 h-5 text-emerald-600 rounded border-slate-300 dark:border-slate-600 focus:ring-emerald-500"
                />
                <label htmlFor="isActive" className="ml-2.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Active (visible to customers)
                </label>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800 mt-6">
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-5 py-2.5 text-slate-600 dark:text-slate-300 font-bold bg-slate-50 dark:bg-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-white font-bold bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors shadow-sm text-sm"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Categories Table */}
      <div className="bg-white dark:bg-[#0d1322] rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-800/80">
              <tr>
                <th scope="col" className="px-6 py-4 w-12"><span className="sr-only">Reorder</span></th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Name</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Status</th>
                <th scope="col" className="px-6 py-4 text-right text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="categories">
                {(provided) => (
                  <tbody 
                    className="bg-white dark:bg-[#0d1322] divide-y divide-slate-50 dark:divide-slate-800/60"
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                  >
                    {filteredCategories.map((category, index) => (
                      <Draggable key={category.id} draggableId={category.id.toString()} index={index}>
                        {(provided, snapshot) => (
                          <tr 
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group ${snapshot.isDragging ? 'bg-emerald-50 dark:bg-emerald-950/40 shadow-lg ring-1 ring-emerald-500 z-10' : ''}`}
                            style={provided.draggableProps.style}
                          >
                            <td className="px-6 py-4 whitespace-nowrap text-slate-400">
                              <div {...provided.dragHandleProps} aria-label={`Reorder ${category.name}`} className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700">
                                <GripVertical className="w-5 h-5" />
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                                  {category.image ? (
                                    <img src={category.image} alt={category.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <span className="text-slate-300 dark:text-slate-600 font-bold text-lg">{category.name?.charAt(0)}</span>
                                  )}
                                </div>
                                <div className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                  {category.name}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2.5 py-0.5 inline-flex text-[10px] uppercase tracking-wider font-extrabold rounded-md ${
                                category.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                              }`}>
                                {category.is_active ? 'Active' : 'Hidden'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                              <button 
                                onClick={() => openForm(category)}
                                aria-label={`Edit ${category.name}`}
                                className="p-2 text-emerald-600 dark:text-emerald-400 hover:text-white bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-600 dark:hover:bg-emerald-600 rounded-xl transition-colors inline-flex items-center"
                              >
                                <Edit2 className="w-4 h-4"/>
                              </button>
                              <button 
                                onClick={() => handleDelete(category.id)}
                                aria-label={`Delete ${category.name}`}
                                className="p-2 text-rose-600 dark:text-rose-400 hover:text-white bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-600 dark:hover:bg-rose-600 rounded-xl transition-colors inline-flex items-center"
                              >
                                <Trash2 className="w-4 h-4"/>
                              </button>
                            </td>
                          </tr>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {filteredCategories.length === 0 && (
                      <tr>
                        <td colSpan="4" className="px-6 py-12 text-center">
                          <p className="text-slate-500 dark:text-slate-400 font-medium">
                            {searchTerm ? `No categories match "${searchTerm}"` : 'No categories found. Click "Add Category" to create one.'}
                          </p>
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
