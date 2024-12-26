const createInventory = () => {
    const inventoryContainer = document.createElement('div');
    inventoryContainer.id = 'inventory';
    inventoryContainer.style.width = '195px';
    inventoryContainer.style.height = '352px';
    inventoryContainer.style.backgroundColor = '#3A3428';
    inventoryContainer.style.border = '2px solid #382F24';
    inventoryContainer.style.padding = '8px';
    inventoryContainer.style.display = 'grid';
    inventoryContainer.style.gridTemplateColumns = 'repeat(4, 1fr)';
    inventoryContainer.style.gap = '4px';
  
      // Prevent click-through
  inventoryContainer.addEventListener('mousedown', (event) => {
    event.stopPropagation();
  });

    // Create 28 inventory slots
    for (let i = 0; i < 28; i++) {
      const slot = document.createElement('div');
      slot.style.backgroundColor = '#5D4E3C';
      slot.style.aspectRatio = '1';
      inventoryContainer.appendChild(slot);
    }
  
    return inventoryContainer;
  };
  
  export { createInventory };