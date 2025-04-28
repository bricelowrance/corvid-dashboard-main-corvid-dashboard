import React from 'react';

function ResponsiveCardView({ data, columnConfig, editingRowId, editedData, handleInputChange, handleSave, handleCancelEdit, handleApprove, viewMode }) {
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      // You can customize the format here:
      return date.toLocaleDateString('en-US'); // Example: MM/DD/YYYY
      // Alternatively, for YYYY-MM-DD:
      // return date.toISOString().slice(0, 10);
      // Or for other formats, explore date-fns or moment.js libraries for more options.
    } catch (error) {
      console.error("Error formatting date:", error);
      return '-';
    }
  };

  return (
    <div className="space-y-4">
      {data.map((row) => (
        <div key={row.employee_id} className="bg-corvid-blue shadow-md rounded-md p-4">
          {columnConfig.map((column) => (
            <div key={column.key} className="mb-2">
              <strong className="font-semibold">{column.displayName}:</strong>{' '}
              <span>
                {column.key === 'actions' ? (
                  <div className="flex space-x-2">
                    {editingRowId !== row.employee_id && viewMode !== 'approved' && (
                      <button
                        onClick={() => handleEdit(row)}
                        className="px-3 py-2 bg-blue-500 text-white rounded text-sm"
                      >
                        Edit
                      </button>
                    )}
                    {editingRowId !== row.employee_id && viewMode === 'pending' && (
                      <button
                        onClick={() => handleApprove(row)}
                        className="px-3 py-2 bg-blue-950 text-white rounded text-sm"
                      >
                        Approve
                      </button>
                    )}
                    {editingRowId === row.employee_id && (
                      <>
                        <button
                          onClick={() => handleSave(row)}
                          className="px-3 py-2 bg-green-500 text-white rounded text-sm"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => handleCancelEdit(row.employee_id)}
                          className="px-3 py-2 bg-gray-400 text-white rounded text-sm"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  <>
                    {editingRowId === row.employee_id && columnConfig.find(c => c.key === column.key && ['employee_email', 'email_date', 'login_id', 'computer_date', 'work_location'].includes(c.key)) ? (
                      <input
                        type="text"
                        className="shadow-sm focus:ring-black focus:border-black block w-full sm:text-sm border-black border-2 rounded-md"
                        value={editedData[row.employee_id]?.[column.key] || ''}
                        onChange={(e) => handleInputChange(e, row.employee_id, column.key)}
                      />
                    ) : (
                      <span>
                        {column.key.includes('date') ? formatDate(row[column.key]) : row[column.key]?.toString() || '-'}
                      </span>
                    )}
                  </>
                )}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default ResponsiveCardView;