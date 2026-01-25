import React, { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import type { User, Subject, CourseMaterial } from '../utils/supabaseClient';
//import NavigationSidebar from './NavigationSidebar';
import SubjectManagement from './SubjectManagement';
import { Upload, Trash2, FileText, BookOpen, Calendar, HardDrive, AlertTriangle, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import PremiumLoader from '../layouts/PremiumLoader';

// ==========================================
// 1. CUSTOM CONFIRMATION MODAL COMPONENT
// ==========================================
interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  itemName?: string;
  isDeleting: boolean;
}

const DeleteConfirmationModal: React.FC<DeleteModalProps> = ({ 
  isOpen, onClose, onConfirm, title, message, itemName, isDeleting 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden transform transition-all scale-100">
        
        {/* Icon Header */}
        <div className="flex flex-col items-center pt-8 pb-4">
          <div className="bg-red-50 p-3 rounded-full mb-3">
             <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">{title}</h3>
        </div>

        {/* Content */}
        <div className="px-8 pb-6 text-center">
          <p className="text-gray-500 mb-2">
            {message} {itemName && <span className="font-semibold text-gray-800">"{itemName}"</span>}?
          </p>
          
          <div className="bg-red-50 border border-red-100 rounded-lg p-3 mt-4 text-left flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">
              This action will permanently delete this file. This cannot be undone.
            </p>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="bg-gray-50 px-6 py-4 flex gap-3 justify-center">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 px-4 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isDeleting ? (
               <>Deleting...</>
            ) : (
               <><Trash2 className="w-4 h-4" /> Delete</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// MAIN COMPONENT
// ==========================================

interface FacultyCourseMaterialsProps {
  user: User;
}

const FacultyCourseMaterials: React.FC<FacultyCourseMaterialsProps> = ({ user }) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [materials, setMaterials] = useState<CourseMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  // 2. NEW STATE FOR DELETE MODAL
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    materialId: '',
    fileUrl: '',
    title: '',
    itemName: '',
  });
  const [isDeleting, setIsDeleting] = useState(false);

  // Form state
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [materialType, setMaterialType] = useState<'pdf' | 'syllabus' | 'notes' | 'assignment'>('pdf');
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: subjectsData } = await supabase
        .from('subjects')
        .select('*')
        .order('semester', { ascending: true });

      setSubjects(subjectsData || []);

      const { data: materialsData } = await supabase
        .from('course_materials')
        .select('*')
        .eq('faculty_id', user.id)
        .order('created_at', { ascending: false });

      setMaterials(materialsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error fetching data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        toast.error('Please upload only PDF files');
        return;
      }
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast.error('File size should not exceed 10MB');
        return;
      }
      setFile(selectedFile);
      toast.success('File selected successfully');
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSubject || !title || !file) {
      toast.error('Please fill all required fields and select a file');
      return;
    }

    setUploading(true);

    try {
      const subject = subjects.find(s => s.id === selectedSubject);
      if (!subject) {
        toast.error('Subject not found');
        return;
      }

      const fileName = `${subject.code}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('course-materials')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('course_materials')
        .insert({
          subject_id: selectedSubject,
          faculty_id: user.id,
          title,
          description: description || null,
          file_url: fileName,
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
          material_type: materialType,
          semester: subject.semester,
        });

      if (dbError) throw dbError;

      toast.success('Material uploaded successfully!');
      
      setSelectedSubject('');
      setTitle('');
      setDescription('');
      setMaterialType('pdf');
      setFile(null);
      
      fetchData();
    } catch (error) {
      console.error('Error uploading material:', error);
      toast.error('Error uploading material. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // 3. UPDATED: OPEN DELETE MODAL
  const confirmDeleteMaterial = (material: CourseMaterial) => {
    setDeleteModal({
      isOpen: true,
      materialId: material.id,
      fileUrl: material.file_url,
      title: 'Delete Material',
      itemName: material.title
    });
  };

  // 4. UPDATED: EXECUTE DELETE (Replaces old handleDelete)
  const executeDeleteMaterial = async () => {
    setIsDeleting(true);
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('course-materials')
        .remove([deleteModal.fileUrl]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('course_materials')
        .delete()
        .eq('id', deleteModal.materialId);

      if (dbError) throw dbError;

      toast.success('Material deleted successfully!');
      fetchData();
      setDeleteModal({ ...deleteModal, isOpen: false });
    } catch (error) {
      console.error('Error deleting material:', error);
      toast.error('Error deleting material. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown';
    const mb = bytes / (1024 * 1024);
    return mb < 1 ? `${(bytes / 1024).toFixed(1)} KB` : `${mb.toFixed(1)} MB`;
  };

  const getMaterialTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      syllabus: 'bg-purple-100 text-purple-700',
      notes: 'bg-blue-100 text-blue-700',
      assignment: 'bg-orange-100 text-orange-700',
      pdf: 'bg-gray-100 text-gray-700',
    };
    return colors[type] || colors.pdf;
  };

  if (loading) {
    return (
      <div className="flex">
        <div className="flex-1 flex items-center justify-center h-screen">
          <PremiumLoader message="Loading course materials..." />
        </div>
      </div>
    );
  }

  return (
    <div className="flex bg-gray-50 min-h-screen">
      
      {/* 5. ADDED: Render the Custom Delete Modal */}
      <DeleteConfirmationModal 
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
        onConfirm={executeDeleteMaterial}
        title={deleteModal.title}
        message="Are you sure you want to delete"
        itemName={deleteModal.itemName}
        isDeleting={isDeleting}
      />

      {/* Main Content Area */}
      <div className="flex-1 p-4 md:p-8 w-full max-w-full overflow-hidden">
        <div className="mb-6 md:mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">Course Materials</h2>
          <p className="text-sm md:text-base text-gray-600">Upload and manage study materials for your courses</p>
        </div>

        {/* Subject Management */}
        <SubjectManagement onSubjectAdded={fetchData} />

        {/* Upload Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6 mb-8">
          {/* ... (Upload form code remains exactly the same) ... */}
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-100 rounded-lg shrink-0">
              <Upload className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg md:text-xl font-semibold text-gray-800">Upload New Material</h3>
              <p className="text-sm text-gray-600">Add study materials for your courses</p>
            </div>
          </div>

          <form onSubmit={handleUpload} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                  required
                >
                  <option value="">Select a subject</option>
                  {subjects.map(subject => (
                    <option key={subject.id} value={subject.id}>
                      {subject.code} - {subject.name} (Sem {subject.semester})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Material Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={materialType}
                  onChange={(e) => setMaterialType(e.target.value as any)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                  required
                >
                  <option value="pdf">📄 General PDF</option>
                  <option value="syllabus">📚 Syllabus</option>
                  <option value="notes">📝 Lecture Notes</option>
                  <option value="assignment">📋 Assignment</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Chapter 1 - Introduction to Data Structures"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the material..."
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload PDF File <span className="text-red-500">*</span>
              </label>
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                required
              />
              {file && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                  <FileText className="w-5 h-5 text-green-600 shrink-0" />
                  <div className="overflow-hidden">
                    <p className="text-sm font-medium text-green-800 truncate">{file.name}</p>
                    <p className="text-xs text-green-600">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
              )}
              <p className="mt-2 text-xs text-gray-500">Maximum file size: 10MB</p>
            </div>

            <button
              type="submit"
              disabled={uploading}
              className="w-full md:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Upload Material
                </>
              )}
            </button>
          </form>
        </div>

        {/* Uploaded Materials List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 md:p-6 border-b border-gray-200">
            <h3 className="text-lg md:text-xl font-semibold text-gray-800">Your Uploaded Materials</h3>
            <p className="text-sm text-gray-600 mt-1">
              {materials.length} material{materials.length !== 1 ? 's' : ''} uploaded
            </p>
          </div>

          {materials.length === 0 ? (
            <div className="p-8 text-center">
              <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">No materials uploaded yet</p>
              <p className="text-gray-500 text-sm mt-2">Upload your first course material to get started</p>
            </div>
          ) : (
            <>
              {/* DESKTOP VIEW: Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">File</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Uploaded</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {materials.map(material => (
                      <tr key={material.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-900">{material.title}</span>
                            {material.description && (
                              <span className="text-xs text-gray-500 mt-1 line-clamp-1" title={material.description}>
                                {material.description}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getMaterialTypeColor(material.material_type)}`}>
                            {material.material_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 max-w-[150px] truncate" title={material.file_name}>
                            {material.file_name}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{formatFileSize(material.file_size)}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(material.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            // 6. UPDATED: Call custom modal function
                            onClick={() => confirmDeleteMaterial(material)}
                            className="text-red-600 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-all"
                            title="Delete"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* MOBILE VIEW: Cards */}
              <div className="md:hidden p-4 space-y-4">
                {materials.map(material => (
                  <div key={material.id} className="border border-gray-200 rounded-lg p-4 shadow-sm bg-white">
                    <div className="flex justify-between items-start gap-3 mb-3">
                      <div>
                        <h4 className="font-semibold text-gray-900 line-clamp-2">{material.title}</h4>
                        {material.description && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{material.description}</p>
                        )}
                      </div>
                      <button
                        // 7. UPDATED: Call custom modal function
                        onClick={() => confirmDeleteMaterial(material)}
                        className="text-red-600 p-1.5 bg-red-50 rounded-lg shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center justify-between">
                         <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getMaterialTypeColor(material.material_type)}`}>
                            {material.material_type}
                          </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <span className="truncate">{material.file_name}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
                        <div className="flex items-center gap-1">
                           <HardDrive className="w-3 h-3" />
                           {formatFileSize(material.file_size)}
                        </div>
                        <div className="flex items-center gap-1">
                           <Calendar className="w-3 h-3" />
                           {new Date(material.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FacultyCourseMaterials;