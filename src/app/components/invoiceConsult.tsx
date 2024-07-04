import React, { useState, useEffect, useContext } from "react";
import styles from "../styles/invoiceConsult.module.css";
import categories from "../utils/categories";
import { jsPDF } from "jspdf";
import { getInvoices, deleteInvoice } from "../services/api";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  AiOutlinePicture,
  AiOutlineEdit,
  AiTwotoneDelete,
} from "react-icons/ai";
import { AppContext } from "../context";

const InvoiceConsult: React.FC = () => {
  const context = useContext(AppContext);
  const [month, setMonth] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [invoices, setInvoices] = useState<
    Array<{
      id: string;
      date: string;
      category: string;
      description: string;
      value: number;
      imageUrl: string;
      userName: string;
    }>
  >([]);
  const [filteredInvoices, setFilteredInvoices] = useState<
    Array<{
      id: string;
      date: string;
      category: string;
      description: string;
      value: number;
      imageUrl: string;
      userName: string;
    }>
  >([]);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null);
  const [fileKeyToDelete, setFileKeyToDelete] = useState<string | null>(null);

  useEffect(() => {
    const calculateTotalAmount = () => {
      const total = filteredInvoices.reduce(
        (accumulator, currentInvoice) => accumulator + currentInvoice.value,
        0
      );
      setTotalAmount(total);
    };
    calculateTotalAmount();
  }, [filteredInvoices]);

  const handleMonthChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedMonth = event.target.value;
    setMonth(selectedMonth);
  };

  useEffect(() => {
    const fetchInvoices = async () => {
      if (month) {
        context.openLoading();
        try {
          const data = await getInvoices(`2024-${month}`);
          const transformedData = data.map((invoice: any) => {
            const date = new Date(invoice.Date);
            return {
              id: invoice.InvoiceId,
              date: date.toLocaleDateString("es-ES", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              }),
              category: invoice.Category || "Sin Categoría",
              description: invoice.Description,
              value: invoice.Value,
              imageUrl: invoice.ImgLink,
              userName: invoice.UserName,
            };
          });

          // Ordenar las facturas por fecha
          const sortedData = transformedData.sort((a: { date: string; }, b: { date: string; }) => {
            const dateA = new Date(a.date.split('/').reverse().join('/'));
            const dateB = new Date(b.date.split('/').reverse().join('/'));
            return dateA.getTime() - dateB.getTime();
          });

          setInvoices(sortedData);
          filterInvoices(sortedData, selectedCategory);

          // Agrupar y sumar los valores por categoría
          const invoiceDataByCategory = sortedData.reduce((acc: any, curr: any) => {
            acc[curr.category] = (acc[curr.category] || 0) + curr.value;
            return acc;
          }, {});
          context.updateInvoiceDataByMonth(month, invoiceDataByCategory);
          context.setCurrentMonth(month);
          console.log("actual month:", context.currentMonth);
        } catch (error: any) {
          if (error.message === 'Unauthorized') {
            toast.error('Tu sesión ha expirado. Por favor, inicia sesión de nuevo.');
            setTimeout(() => {
              window.location.href = '/';
            }, 3000);
          } else {
            toast.error('Error al consultar facturas. Por favor, inténtelo de nuevo más tarde.');
          }
        } finally {
          context.closeLoading();
        }
      }
    };
    fetchInvoices();
  }, [month]);

  const handleCategoryChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const selectedCategory = event.target.value;
    setSelectedCategory(selectedCategory);
    filterInvoices(invoices, selectedCategory);
  };

  const filterInvoices = (
    invoicesToFilter: Array<{
      id: string;
      date: string;
      category: string;
      description: string;
      value: number;
      imageUrl: string;
      userName: string;
    }>,
    category: string
  ) => {
    if (category !== "") {
      const filtered = invoicesToFilter.filter(
        (invoice) => invoice.category === category
      );
      setFilteredInvoices(filtered);
    } else {
      setFilteredInvoices(invoicesToFilter);
    }
  };

  const generateReport = () => {
    const doc = new jsPDF();

    doc.setFontSize(10);
    let y = 25;

    const logo = new Image();
    logo.src = "/logo.png";
    doc.addImage(logo, "PNG", 10, 10, 50, 10);

    let reportTitle = "Reporte de Facturas";
    if (month !== "") {
      reportTitle += ` mes ${month}`;
    }
    if (selectedCategory !== "") {
      reportTitle += ` categoría ${selectedCategory}`;
    }

    doc.text(reportTitle, 60, y);
    y += 10;

    doc.line(10, y, 200, y);
    y += 5;

    filteredInvoices.forEach((invoice) => {
      doc.text(
        `Fecha: ${invoice.date} | Categoría: ${invoice.category} | Descripción: ${invoice.description} | Valor: ${invoice.value}`,
        10,
        y
      );
      y += 5;

      doc.line(10, y, 200, y);
      y += 5;
    });
    y += 10;
    doc.text(`Total: ${totalAmount}`, 10, y);
    doc.save("reporte_facturas.pdf");
  };

  const handleUpdate = (id: string) => {
    // Lógica para actualizar la factura con el ID proporcionado
    console.log("Actualizar factura con ID:", id);
  };

  const handleDelete = (id: string, fileKey: string) => {
    setInvoiceToDelete(id);
    setFileKeyToDelete(fileKey);
    context.openModal();
  };

  const confirmDelete = async () => {
    if (invoiceToDelete && fileKeyToDelete) {
      context.closeModal();
      context.openLoading();
      try {
        await deleteInvoice(invoiceToDelete, fileKeyToDelete);
        // Elimina la factura de la lista local después de la eliminación exitosa
        setFilteredInvoices(filteredInvoices.filter(invoice => invoice.id !== invoiceToDelete));
        toast.success('Factura eliminada exitosamente.');
      } catch (error: any) {
        if (error.message === 'Unauthorized') {
          toast.error('Tu sesión ha expirado. Por favor, inicia sesión de nuevo.');
          setTimeout(() => {
            window.location.href = '/';
          }, 3000);
        } else {
          toast.error('Error al eliminar factura. Por favor, inténtelo de nuevo más tarde.');
        }
      } finally {
        context.closeLoading();
        setInvoiceToDelete(null);
        setFileKeyToDelete(null);
      }
    }
  };

  const handleView = (imageUrl: string) => {
    window.open(imageUrl, "_blank");
  };

  // Función para deshabilitar los meses posteriores al mes actual
  const disableFutureMonths = () => {
    const currentMonth = new Date().getMonth() + 1; // Obtiene el mes actual (1-12)
    const selectElement = document.getElementById('monthSelect') as HTMLSelectElement;
    for (let i = 0; i < selectElement.options.length; i++) {
      if (parseInt(selectElement.options[i].value) > currentMonth) {
        selectElement.options[i].disabled = true;
      }
    }
  };

  // Llama a disableFutureMonths cuando el componente se monte
  useEffect(() => {
    disableFutureMonths();
  }, []);

  return (
    <div className={styles.container}>
      {/* Select para meses */}
      <select
        id="monthSelect"
        className={styles.selectMonth}
        value={month}
        onChange={handleMonthChange}
      >
        <option value="01">Enero</option>
        <option value="02">Febrero</option>
        <option value="03">Marzo</option>
        <option value="04">Abril</option>
        <option value="05">Mayo</option>
        <option value="06">Junio</option>
        <option value="07">Julio</option>
        <option value="08">Agosto</option>
        <option value="09">Septiembre</option>
        <option value="10">Octubre</option>
        <option value="11">Noviembre</option>
        <option value="12">Diciembre</option>
      </select>

      {/* Select para categorías */}
      <select
        className={styles.selectCategory}
        value={selectedCategory}
        onChange={handleCategoryChange}
      >
        <option value="">Todas las categorías</option>
        {categories.map((category, index) => (
          <option key={index} value={category}>
            {category}
          </option>
        ))}
      </select>

      {/* Lista para mostrar facturas */}
      <div className={styles.invoiceList}>
        {filteredInvoices.map((invoice) => (
          <div key={invoice.id} className={styles.invoiceItem}>
            <div className={styles.invoiceDetails}>
              <div>
                <p>{invoice.date}</p>
                <p>{invoice.description}</p>
              </div>
              <div>
                <p className={styles.invoiceCategory}>{invoice.category}</p>
              </div>
            </div>
            <div>
              <div className={styles.invoiceDown}>
                <p className={styles.invoiceValue}>
                  ${invoice.value.toFixed(2)}
                </p>
                <p className={styles.invoiceUser}>
                  {invoice.userName}
                </p>
                <div className={styles.invoiceButtons}>
                  <AiOutlinePicture
                    className={styles.viewButton}
                    onClick={() => handleView(invoice.imageUrl)}
                  />
                  <AiOutlineEdit
                    className={context.role === 'Admin' ? styles.updateButton : styles.noViewButton}
                    onClick={() => handleUpdate(invoice.id)}
                  />
                  <AiTwotoneDelete
                    className={context.role === 'Admin' ? styles.deleteButton : styles.noViewButton}
                    onClick={() => handleDelete(invoice.id, invoice.imageUrl)}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.totalAmount}>
        <p>Total: ${totalAmount.toFixed(2)}</p>
      </div>

      {/* Botón de generación de reporte */}
      <button
        className={styles.reportButton}
        onClick={generateReport}
        disabled={filteredInvoices.length === 0}
      >
        Generar Reporte
      </button>

      {/*Modal de confimacion de eliminacion */}
      <div className={context.modal ? styles.modalopen : styles.modalclose}>
      {context.modal && (
        <div className={styles.modalContent}>
          <h2 className="text-2xl font-bold">Confirmación</h2>
          <p className="mt-4">
            ¿Estas seguro de que quieres eliminar esta factura?
          </p>
          <button
            onClick={confirmDelete}
            className="mt-4 p-2 bg-custom-red mr-8 text-white rounded hover:bg-gray-700 transition duration-300"
          >
            Eliminar
          </button>
          <button
            onClick={context.closeModal}
            className="mt-4 p-2 bg-gray-500 text-white rounded hover:bg-gray-700 transition duration-300"
          >
            Volver
          </button>
        </div>
      )}
    </div>
      <ToastContainer />
    </div>
  );
};

export default InvoiceConsult;
