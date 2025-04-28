import React, { useState, useEffect, useCallback } from 'react';
import ResponsiveCardView from './ResponsiveCardView.jsx'; // Adjust the path if needed

function AdminTracking() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // Set default view mode
  const [searchTerm, setSearchTerm] = useState('');
  const [editingRowId, setEditingRowId] = useState(null);
  const [editedData, setEditedData] = useState({});
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const backendUrl = '/api/onboarding_admin'; // Replace with your actual backend URL

  // Define the desired column order and display names for different views
  const listColumnConfig = [
    { key: 'employee_name', displayName: 'Employee Name' },
    { key: 'company', displayName: 'Company' },
    { key: 'employee_start_date', displayName: 'Start Date' },
    { key: 'starting_work_year', displayName: 'Career Start Date' },
    { key: 'work_location', displayName: 'Work Location' },
    { key: 'employment_type', displayName: 'Employment Type' },
    { key: 'recruitment_source', displayName: 'Recruitment Source' },
    { key: 'employee_salary', displayName: 'Salary' },
    { key: 'actions', displayName: '' },
  ];

  const detailColumnConfig = [
    { key: 'employee_name', displayName: 'Employee Name' },
    { key: 'company', displayName: 'Company' },
    { key: 'employee_start_date', displayName: 'Start Date' },
    { key: 'starting_work_year', displayName: 'Career Start Date' },
    { key: 'work_location', displayName: 'Work Location' },
    { key: 'employment_type', displayName: 'Employment Type' },
    { key: 'recruitment_source', displayName: 'Recruitment Source' },
    { key: 'employee_salary', displayName: 'Salary' },
    { key: 'actions', displayName: '' },
  ];

  const archiveColumnConfig = [
    { key: 'employee_name', displayName: 'Employee Name' },
    { key: 'company', displayName: 'Company' },
    { key: 'employee_start_date', displayName: 'Start Date' },
    { key: 'starting_work_year', displayName: 'Career Start Date' },
    { key: 'work_location', displayName: 'Work Location' },
    { key: 'employment_type', displayName: 'Employment Type' },
    { key: 'recruitment_source', displayName: 'Recruitment Source' },
    { key: 'employee_salary', displayName: 'Salary' },
    { key: 'actions', displayName: '' },
  ];

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(backendUrl);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const jsonData = await response.json();
      setData(jsonData);
      console.log("Admin Data State:", jsonData);
    } catch (err) {
      setError(err);
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  }, [backendUrl]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const editableColumns = ['name', 'description', 'details', 'status']; // Define editable columns

  const getColumnConfig = () => {
    if (viewMode === 'list') {
      return [...listColumnConfig, { key: 'edit', displayName: '' }, { key: 'delete', displayName: '' }];
    } else if (viewMode === 'detail') {
      return detailColumnConfig;
    } else if (viewMode === 'archive') {
      return archiveColumnConfig;
    }
    return [...listColumnConfig, { key: 'edit', displayName: '' }, { key: 'delete', displayName: '' }]; // Default
  };

  const filteredData = () => {
    console.log("Admin View Mode:", viewMode);

    let filtered = data;

    if (viewMode === 'detail') {
      // Example: Assuming 'status' can be 'active' for detail view
      filtered = filtered.filter(row => row.status === 'active');
    } else if (viewMode === 'archive') {
      // Example: Assuming there's an 'is_archived' flag
      filtered = filtered.filter(row => row.is_archived);
    }

    const lowerSearchTerm = searchTerm.toLowerCase();
    filtered = filtered.filter(row =>
      Object.values(row).some(value =>
        typeof value === 'string' && value.toLowerCase().includes(lowerSearchTerm)
      )
    );

    if (sortConfig.key !== null) {
      filtered.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered;
  };

  const handleInputChange = (event, id, column) => {
    const { value } = event.target;
    setEditedData(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [column]: value,
      },
    }));
  };

  const formatDateForEdit = (isoDateString) => {
    if (!isoDateString) {
      return '';
    }
    const date = new Date(isoDateString);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  const handleEdit = (row) => {
    setEditingRowId(row.id); // Assuming 'id' is the unique identifier
    const formattedRowData = {};
    for (const key in row) {
      if (row.hasOwnProperty(key)) {
        formattedRowData[key] = key.includes('date') && row[key] ? formatDateForEdit(row[key]) : row[key];
      }
    }
    setEditedData(prev => ({
      ...prev,
      [row.id]: formattedRowData,
    }));
  };

  const handleSave = async (row) => {
    try {
      const updatedData = editedData[row.id];
      const response = await fetch(`${backendUrl}/${row.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData),
      });

      if (response.ok) {
        const updatedRecord = await response.json();
        setData(prevData =>
          prevData.map(item =>
            item.id === updatedRecord.id ? updatedRecord : item
          )
        );
        setEditingRowId(null);
        setEditedData(prev => {
          const { [row.id]: _, ...rest } = prev;
          return rest;
        });
      } else {
        const errorData = await response.json();
        console.error('Error updating data:', errorData);
        setError(new Error(`Failed to update data: ${JSON.stringify(errorData)}`));
      }
    } catch (error) {
      console.error('Error updating data:', error);
      setError(error);
    }
  };

  const handleCancelEdit = (rowId) => {
    setEditingRowId(null);
    setEditedData(prev => {
      const { [rowId]: _, ...rest } = prev;
      return rest;
    });
  };

  const handleDelete = async (row) => {
    if (window.confirm(`Are you sure you want to delete item with ID: ${row.id}?`)) {
      try {
        const response = await fetch(`${backendUrl}/${row.id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          setData(prevData => prevData.filter(item => item.id !== row.id));
        } else {
          const errorData = await response.json();
          console.error('Error deleting data:', errorData);
          setError(new Error(`Failed to delete data: ${JSON.stringify(errorData)}`));
        }
      } catch (error) {
        console.error('Error deleting data:', error);
        setError(error);
      }
    }
  };

  // Handlers for the navigation buttons
  const handleList = () => {
    setViewMode('list');
  };

  const handleDetailView = () => {
    setViewMode('detail');
  };

  const handleArchive = () => {
    setViewMode('archive');
  };

  const handleSort = (key) => {
    let direction = 'ascending';
    const currentColumnConfig = getColumnConfig().find(col => col.key === key);
    if (currentColumnConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US');
    } catch (error) {
      console.error("Error formatting date:", error);
      return '-';
    }
  };

  const renderTableRow = (row) => (
    <tr key={row.id}>
      {getColumnConfig().map((column) => (
        <td key={column.key} className="px-6 py-4 whitespace-nowrap text-corvid-blue">
          {column.key === 'actions' ? (
            <>
              {editingRowId !== row.id && (
                <button
                  onClick={() => handleEdit(row)}
                  className="px-2 py-1 bg-blue-500 text-white rounded mr-2 text-xs"
                >
                  Edit
                </button>
              )}
              {editingRowId === row.id && (
                <>
                  <button
                    onClick={() => handleSave(row)}
                    className="px-2 py-1 bg-green-500 text-white rounded mr-2 text-xs"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => handleCancelEdit(row.id)}
                    className="px-2 py-1 bg-gray-400 text-white rounded text-xs"
                  >
                    Cancel
                  </button>
                </>
              )}
            </>
          ) : column.key === 'edit' && editingRowId !== row.id ? (
            <button
              onClick={() => handleEdit(row)}
              className="px-2 py-1 bg-blue-500 text-white rounded text-xs"
            >
              Edit
            </button>
          ) : column.key === 'delete' ? (
            <button
              onClick={() => handleDelete(row)}
              className="px-2 py-1 bg-red-500 text-white rounded text-xs"
            >
              Delete
            </button>
          ) : (
            <>
              {editingRowId === row.id && editableColumns.includes(column.key) ? (
                <input
                  type="text"
                  className="shadow-sm focus:ring-black focus:border-black block w-full sm:text-sm border-black border-2 rounded-md"
                  value={editedData[row.id]?.[column.key] || ''}
                  onChange={(e) => handleInputChange(e, row.id, column.key)}
                  placeholder={column.key.includes('date') ? 'MM/DD/YYYY' : ''}
                />
              ) : (
                <span>
                  {column.key.includes('date') ? formatDate(row[column.key]) : row[column.key]?.toString() || '-'}
                </span>
              )}
            </>
          )}
        </td>
      ))}
    </tr>
  );

  if (loading) {
    return <div className="p-6">Loading data...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-500">Error: {error.message}</div>;
  }

  return (
    <div className="p-6 bg-gray-50">
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search..."
          className="w-full p-2 border rounded relative text-corvid-blue"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <div className="mb-4 flex justify-start space-x-2">
        <button
          onClick={handleList}
          className={`px-8 py-1 rounded w-auto ${viewMode === 'list' ? 'bg-blue-950 text-white' : 'bg-gray-400 text-gray-700'} text-sm`}
        >
          List
        </button>
        <button
          onClick={handleDetailView}
          className={`px-8 py-1 rounded w-auto ${viewMode === 'detail' ? 'bg-blue-950 text-white' : 'bg-gray-400 text-gray-700'} text-sm`}
        >
          Details
        </button>
        <button
          onClick={handleArchive}
          className={`px-8 py-1 rounded w-auto ${viewMode === 'archive' ? 'bg-blue-950 text-white' : 'bg-gray-400 text-gray-700'} text-sm`}
        >
          Archive
        </button>
      </div>
      <div className="lg:block hidden overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {getColumnConfig().map((column) => (
                <th
                  key={column.key}
                  className="px-6 py-3 text-left text-xs font-medium text-corvid-blue uppercase tracking-wider cursor-pointer"
                  onClick={() => column.key !== 'actions' && column.key !== 'edit' && column.key !== 'delete' ? handleSort(column.key) : undefined}
                >
                  <div className="flex items-center">
                    <span>{column.displayName}</span>
                    <span className="ml-1">
                      {sortConfig.key === column.key && sortConfig.direction === 'ascending' && column.key !== 'actions' && column.key !== 'edit' && column.key !== 'delete' && ' ▲'}
                      {sortConfig.key === column.key && sortConfig.direction === 'descending' && column.key !== 'actions' && column.key !== 'edit' && column.key !== 'delete' && ' ▼'}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredData().map(renderTableRow)}
          </tbody>
        </table>
      </div>
      <div className="lg:hidden">
        <ResponsiveCardView
          data={filteredData()}
          columnConfig={getColumnConfig()}
          editingRowId={editingRowId}
          editedData={editedData}
          handleInputChange={handleInputChange}
          handleSave={handleSave}
          handleCancelEdit={handleCancelEdit}
          viewMode={viewMode}
          onDelete={handleDelete} // Pass handleDelete to ResponsiveCardView
        />
      </div>
    </div>
  );
}

export default AdminTracking;