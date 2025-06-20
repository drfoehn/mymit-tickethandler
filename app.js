document.addEventListener('DOMContentLoaded', () => {
    const tableHead = document.querySelector('#tickets-table thead');
    const uploadInput = document.getElementById('pdf-upload');
    const tableBody = document.querySelector('#tickets-table tbody');
    const downloadButton = document.getElementById('download-json');
    
    // Edit Modal elements
    const editModal = document.getElementById('edit-modal');
    const editForm = document.getElementById('edit-form');
    const cancelEditButton = document.getElementById('cancel-edit');
    
    // Show Modal elements
    const showModal = document.getElementById('show-modal');
    const showModalContent = document.getElementById('show-modal-content');
    const closeShowButton = document.getElementById('close-show');

    // Filter inputs
    const filterTicketNr = document.getElementById('filter-ticket-nr');
    const filterErsteller = document.getElementById('filter-ersteller');
    const filterKostenstelle = document.getElementById('filter-kostenstelle');
    const filterStatus = document.getElementById('filter-status');
    const filterType = document.getElementById('filter-type');
    const filterDateStart = document.getElementById('filter-date-start');
    const filterDateEnd = document.getElementById('filter-date-end');
    const clearFiltersButton = document.getElementById('clear-filters');

    // State
    let tickets = [];
    let columnVisibility = {};
    let currentSort = { column: 'datum', direction: 'desc' };

    const germanMonths = {
        'januar': '01', 'februar': '02', 'märz': '03', 'april': '04', 'mai': '05', 'juni': '06',
        'juli': '07', 'august': '08', 'september': '09', 'oktober': '10', 'november': '11', 'dezember': '12'
    };

    const normalizeDate = (dateStr) => {
        if (!dateStr) return new Date().toISOString().split('T')[0];
        const parts = dateStr.toLowerCase().replace('.', '').split(' ');
        if (parts.length === 3) {
            const day = parts[0].padStart(2, '0');
            const month = germanMonths[parts[1]];
            const year = parts[2];
            if (day && month && year) {
                return `${year}-${month}-${day}`;
            }
        }
        return new Date().toISOString().split('T')[0];
    };

    const loadSettings = () => {
        const storedTickets = localStorage.getItem('tickets');
        if (storedTickets) {
            tickets = JSON.parse(storedTickets);
        }

        const storedVisibility = localStorage.getItem('columnVisibility');
        columnVisibility = storedVisibility ? JSON.parse(storedVisibility) : {
            kostenstelle: false,
            beschreibung: false,
            equipment: false,
            raum: false
        };
        applyColumnVisibility();
    };

    const saveTickets = () => {
        localStorage.setItem('tickets', JSON.stringify(tickets));
    };

    const saveColumnVisibility = () => {
        localStorage.setItem('columnVisibility', JSON.stringify(columnVisibility));
    };

    const renderTable = (filteredTickets = tickets) => {
        tableBody.innerHTML = '';

        // Sort the tickets before rendering
        const sortedTickets = [...filteredTickets].sort((a, b) => {
            const valA = a[currentSort.column];
            const valB = b[currentSort.column];
            const direction = currentSort.direction === 'asc' ? 1 : -1;

            if (currentSort.column === 'datum') {
                return (new Date(valA) - new Date(valB)) * direction;
            }

            if (valA < valB) return -1 * direction;
            if (valA > valB) return 1 * direction;
            return 0;
        });

        sortedTickets.forEach((ticket) => {
            const originalIndex = tickets.findIndex(t => t.ticketNummer === ticket.ticketNummer);
            const row = tableBody.insertRow();
            row.innerHTML = `
                <td>${ticket.ticketNummer}</td>
                <td>${ticket.type}</td>
                <td>${ticket.datum}</td>
                <td>${ticket.erstelltVon}</td>
                <td class="col-kostenstelle">${ticket.kostenstelle}</td>
                <td>${ticket.betreff}</td>
                <td class="description-cell col-beschreibung" data-full-description="${ticket.beschreibung.replace(/"/g, '&quot;')}">
                    <span>${ticket.beschreibung}</span>
                </td>
                <td class="col-equipment">${ticket.equipment}</td>
                <td class="col-raum">${ticket.raum}</td>
                <td>
                    <select data-index="${originalIndex}" class="status-select">
                        <option value="offen" ${ticket.status === 'offen' ? 'selected' : ''}>Offen</option>
                        <option value="in Arbeit" ${ticket.status === 'in Arbeit' ? 'selected' : ''}>In Arbeit</option>
                        <option value="geschlossen" ${ticket.status === 'geschlossen' ? 'selected' : ''}>Geschlossen</option>
                    </select>
                </td>
                <td>
                    <button class="icon-btn show-btn" data-index="${originalIndex}" title="Details anzeigen"><img src="images/eye-icon.svg" alt="Details anzeigen"></button>
                    <button class="icon-btn edit-btn" data-index="${originalIndex}" title="Bearbeiten"><img src="images/pencil-icon.svg" alt="Bearbeiten"></button>
                    <button class="icon-btn delete-btn" data-index="${originalIndex}" title="Löschen"><img src="images/trash-icon.svg" alt="Löschen"></button>
                </td>
            `;
        });
        applyColumnVisibility();
        updateSortIndicators();
    };

    const updateSortIndicators = () => {
        document.querySelectorAll('th.sortable').forEach(th => {
            th.classList.remove('sort-asc', 'sort-desc');
            if (th.dataset.sort === currentSort.column) {
                th.classList.add(`sort-${currentSort.direction}`);
            }
        });
    };

    const applyColumnVisibility = () => {
        document.querySelectorAll('.toggle-vis').forEach(checkbox => {
            const column = checkbox.dataset.column;
            const isVisible = columnVisibility[column] === true; // default to false
            checkbox.checked = isVisible;

            document.querySelectorAll(`.col-${column}, th[data-column="${column}"]`).forEach(el => {
                el.classList.toggle('column-hidden', !isVisible);
            });
        });
    };

    // Event Listeners
    tableHead.addEventListener('click', (event) => {
        const target = event.target;
        if (target.classList.contains('sortable')) {
            const sortColumn = target.dataset.sort;
            if (currentSort.column === sortColumn) {
                currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
            } else {
                currentSort.column = sortColumn;
                currentSort.direction = 'asc';
            }
            applyFilters();
        }
    });

    document.querySelector('.column-toggle').addEventListener('change', (event) => {
        if (event.target.classList.contains('toggle-vis')) {
            const column = event.target.dataset.column;
            columnVisibility[column] = event.target.checked;
            saveColumnVisibility();
            applyColumnVisibility();
        }
    });

    uploadInput.addEventListener('change', async (event) => {
        console.log("File input changed.");
        const file = event.target.files[0];
        if (file && file.type === 'application/pdf') {
            console.log("PDF file selected:", file.name);
            const fileReader = new FileReader();
            fileReader.onload = async (e) => {
                console.log("File loaded by FileReader.");
                const typedarray = new Uint8Array(e.target.result);
                try {
                    console.log("Parsing PDF with pdf.js...");
                    const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
                    console.log("PDF parsed successfully.");
                    let fullText = '';
                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const textContent = await page.getTextContent();
                        fullText += textContent.items.map(item => item.str).join(' ');
                    }
                    console.log("--- Extracted PDF Text ---");
                    console.log(fullText);
                    console.log("--------------------------");
                    const extractedData = extractDataFromText(fullText);
                    if (extractedData.ticketNummer) {
                        if (!tickets.some(t => t.ticketNummer === extractedData.ticketNummer)) {
                            tickets.push(extractedData);
                            saveTickets();
                            applyFilters();
                        } else {
                            alert('Ein Ticket mit dieser Ticket-Nummer existiert bereits.');
                        }
                    } else {
                        alert('Konnte keine Ticket-Nummer aus dem PDF extrahieren. Bitte überprüfen Sie das Format.');
                    }
                } catch (error) {
                    console.error('Error parsing PDF:', error);
                    alert('Fehler beim Verarbeiten des PDFs.');
                }
            };
            console.log("Reading file as ArrayBuffer...");
            fileReader.readAsArrayBuffer(file);
            uploadInput.value = '';
        } else {
            console.warn("No file selected or file is not a PDF.");
            if(file) console.warn("Selected file type:", file.type);
        }
    });

    const extractDataFromText = (text) => {
        const extract = (regex) => text.match(regex)?.[1]?.trim() || null;
        const isServiceanfrage = text.includes('MIT - Serviceanfrage');
        let betreff, beschreibung, kostenstelle;

        if (isServiceanfrage) {
            betreff = extract(/Betreff:\s*Anforderung von:([\s\S]*?)(?=Beschreibung:)/i);
            beschreibung = extract(/Beschreibung:\s*([\s\S]*?)(?=Kunde\/Kundin)/i);
            kostenstelle = extract(/Betroffene Kostenstelle:\s*([\s\S]*?)(?=Mit freundlichen Grüßen)/i);
        } else {
            betreff = extract(/erfasst \/ Betreff:\s*([\s\S]*?)(?=\s*Kundenanliegen)/i);
            beschreibung = extract(/Beschreibung:\s*([\s\S]*?)(?=Kunde\/Kundin|Ticketersteller\/in:)/i);
            kostenstelle = 'N/A';
        }

        const ticket = {
            ticketNummer: extract(/\[#(\d{8}-\d{4})\]/i) || extract(/einsehen:\s*(\S+)/i) || `T-${Date.now()}`,
            type: isServiceanfrage ? 'Serviceanfrage' : 'Störungsmeldung',
            datum: normalizeDate(extract(/Gesendet:\s*\w+,\s*(\d{1,2}\.\s*\w+\s*\d{4})/i)),
            erstelltVon: extract(/Ticketersteller\/in:\s*([\s\S]*?)(?=\s*Gerätename|Genehmiger\/in:)/i),
            kostenstelle: kostenstelle,
            betreff: betreff,
            beschreibung: beschreibung,
            equipment: extract(/Equipmentnummer:\s*([\s\S]*?)(?=\s*Betroffene Raumnummer)/i),
            raum: extract(/Raumnummer:\s*([\s\S]*?)(?=\s*Sie können Ihr Ticket)/i),
            status: 'offen'
        };
        
        for(const key in ticket) {
            if(ticket[key] === null || ticket[key] === '') {
                ticket[key] = 'N/A';
            }
        }
        return ticket;
    };

    const openEditModal = (index) => {
        const ticket = tickets[index];
        document.getElementById('edit-ticket-index').value = index;
        document.getElementById('edit-ticket-nr').value = ticket.ticketNummer;
        document.getElementById('edit-type').value = ticket.type;
        document.getElementById('edit-date').value = ticket.datum;
        document.getElementById('edit-ersteller').value = ticket.erstelltVon;
        document.getElementById('edit-kostenstelle').value = ticket.kostenstelle;
        document.getElementById('edit-betreff').value = ticket.betreff;
        document.getElementById('edit-beschreibung').value = ticket.beschreibung;
        document.getElementById('edit-equipment').value = ticket.equipment;
        document.getElementById('edit-raum').value = ticket.raum;
        editModal.style.display = 'flex';
    };

    const closeEditModal = () => {
        editModal.style.display = 'none';
    };

    const openShowModal = (index) => {
        const ticket = tickets[index];
        showModalContent.innerHTML = `
            <p><strong>Ticket-Nummer:</strong> ${ticket.ticketNummer}</p>
            <p><strong>Typ:</strong> ${ticket.type}</p>
            <p><strong>Datum:</strong> ${ticket.datum}</p>
            <p><strong>Ticketersteller/in:</strong> ${ticket.erstelltVon}</p>
            <p><strong>Kostenstelle:</strong> ${ticket.kostenstelle}</p>
            <p><strong>Betreff:</strong> ${ticket.betreff}</p>
            <p><strong>Equipmentnummer:</strong> ${ticket.equipment}</p>
            <p><strong>Raumnummer:</strong> ${ticket.raum}</p>
            <p><strong>Status:</strong> ${ticket.status}</p>
            <p><strong>Beschreibung:</strong></p>
            <pre style="white-space: pre-wrap; word-wrap: break-word;">${ticket.beschreibung}</pre>
        `;
        showModal.style.display = 'flex';
    };

    const closeShowModal = () => {
        showModal.style.display = 'none';
    };

    tableBody.addEventListener('click', (event) => {
        const target = event.target.closest('.icon-btn');
        if (!target) return;

        const index = target.dataset.index;
        if (index === undefined) return;

        if (target.classList.contains('show-btn')) {
            openShowModal(index);
        } else if (target.classList.contains('edit-btn')) {
            openEditModal(index);
        } else if (target.classList.contains('delete-btn')) {
            if (confirm('Sind Sie sicher, dass Sie dieses Ticket löschen möchten?')) {
                tickets.splice(index, 1);
                saveTickets();
                applyFilters();
            }
        }
    });

    tableBody.addEventListener('change', (event) => {
        const target = event.target;
        const index = target.dataset.index;

        if (index !== undefined && target.classList.contains('status-select')) {
            tickets[index].status = target.value;
            saveTickets();
        }
    });

    editForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const index = document.getElementById('edit-ticket-index').value;
        const updatedTicket = {
            ...tickets[index],
            ticketNummer: document.getElementById('edit-ticket-nr').value,
            type: document.getElementById('edit-type').value,
            datum: document.getElementById('edit-date').value,
            erstelltVon: document.getElementById('edit-ersteller').value,
            kostenstelle: document.getElementById('edit-kostenstelle').value,
            betreff: document.getElementById('edit-betreff').value,
            beschreibung: document.getElementById('edit-beschreibung').value,
            equipment: document.getElementById('edit-equipment').value,
            raum: document.getElementById('edit-raum').value
        };

        tickets[index] = updatedTicket;
        saveTickets();
        applyFilters();
        closeEditModal();
    });

    cancelEditButton.addEventListener('click', closeEditModal);
    closeShowButton.addEventListener('click', closeShowModal);

    const applyFilters = () => {
        let filtered = [...tickets];
        if (filterTicketNr.value) {
            filtered = filtered.filter(t => t.ticketNummer.toLowerCase().includes(filterTicketNr.value.toLowerCase()));
        }
        if (filterErsteller.value) {
            filtered = filtered.filter(t => t.erstelltVon.toLowerCase().includes(filterErsteller.value.toLowerCase()));
        }
        if (filterKostenstelle.value) {
            filtered = filtered.filter(t => t.kostenstelle.toLowerCase().includes(filterKostenstelle.value.toLowerCase()));
        }
        if (filterStatus.value) {
            filtered = filtered.filter(t => t.status === filterStatus.value);
        }
        if (filterType.value) {
            filtered = filtered.filter(t => t.type === filterType.value);
        }
        if (filterDateStart.value) {
            const startDate = new Date(filterDateStart.value);
            filtered = filtered.filter(t => new Date(t.datum) >= startDate);
        }
        if (filterDateEnd.value) {
            const endDate = new Date(filterDateEnd.value);
            endDate.setDate(endDate.getDate() + 1);
            filtered = filtered.filter(t => new Date(t.datum) < endDate);
        }
        renderTable(filtered);
    };

    [filterTicketNr, filterErsteller, filterKostenstelle, filterStatus, filterType, filterDateStart, filterDateEnd].forEach(input => {
        input.addEventListener('input', applyFilters);
    });
    
    clearFiltersButton.addEventListener('click', () => {
        filterTicketNr.value = '';
        filterErsteller.value = '';
        filterKostenstelle.value = '';
        filterStatus.value = '';
        filterType.value = '';
        filterDateStart.value = '';
        filterDateEnd.value = '';
        renderTable();
    });

    downloadButton.addEventListener('click', () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(tickets, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "tickets.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    });

    // Initial Load
    loadSettings();
    applyFilters();
}); 