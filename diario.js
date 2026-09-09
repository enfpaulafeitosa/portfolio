const WHATSAPP_NUMBER = "5585986994455";
const MONOGRAM_PATH = "assets/monograma.svg";

const elements = {
  date: document.querySelector("#entry-date"),
  time: document.querySelector("#entry-time"),
  duration: document.querySelector("#entry-duration"),
  pee: document.querySelector("#entry-pee"),
  poop: document.querySelector("#entry-poop"),
  notes: document.querySelector("#entry-notes"),
  imageName: document.querySelector("#image-name"),
  add: document.querySelector("#add-entry"),
  list: document.querySelector("#entry-list"),
  count: document.querySelector("#entry-count"),
  empty: document.querySelector("#empty-state"),
  clear: document.querySelector("#clear-entries"),
  modal: document.querySelector("#image-modal"),
  modalClose: document.querySelector("#close-modal"),
  modalImage: document.querySelector("#modal-image"),
  download: document.querySelector("#download-image"),
  share: document.querySelector("#share-image"),
  canvas: document.querySelector("#diary-canvas"),
};

let entries = [];
let selectedSide = "";
let currentBlob = null;
let currentObjectUrl = "";
let lastFocusedElement = null;

function pad(value) {
  return String(value).padStart(2, "0");
}

function localDateValue(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function localTimeValue(date = new Date()) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDate(dateValue) {
  const [year, month, day] = dateValue.split("-");
  return year && month && day ? `${day}/${month}` : dateValue;
}

function formatFullDate(dateValue) {
  const [year, month, day] = dateValue.split("-");
  return year && month && day ? `${day}/${month}/${year}` : dateValue;
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function sortedEntries() {
  return [...entries].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
}

function setSelectedSide(side) {
  selectedSide = side;
  document.querySelectorAll(".side-option").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.side === side));
  });
}

function updatePreviewState() {
  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl);
  }

  currentBlob = null;
  currentObjectUrl = "";
  elements.modalImage.removeAttribute("src");
  closeModal();
}

function updateEntryCount() {
  const count = entries.length;
  elements.count.textContent =
    count === 0 ? "Nenhum registro nesta sessão" : `${count} ${count === 1 ? "registro nesta imagem" : "registros nesta imagem"}`;
  elements.empty.hidden = count > 0;
  elements.clear.hidden = count === 0;
}

function buildEntryDescription(entry) {
  const diaper = [entry.pee ? "xixi" : "", entry.poop ? "cocô" : ""].filter(Boolean).join(" e ");
  return `${entry.side}${entry.duration ? ` · ${entry.duration} min` : ""}${diaper ? ` · fralda: ${diaper}` : ""}`;
}

function renderEntries() {
  elements.list.replaceChildren();

  sortedEntries().forEach((entry) => {
    const item = document.createElement("li");
    item.className = "entry-card";

    const content = document.createElement("div");

    const when = document.createElement("span");
    when.className = "entry-when";
    when.textContent = `${formatDate(entry.date)} · ${entry.time}`;

    const main = document.createElement("span");
    main.className = "entry-main";
    main.textContent = buildEntryDescription(entry);

    content.append(when, main);

    if (entry.notes) {
      const notes = document.createElement("span");
      notes.className = "entry-notes";
      notes.textContent = entry.notes;
      content.append(notes);
    }

    const remove = document.createElement("button");
    remove.className = "remove-entry";
    remove.type = "button";
    remove.setAttribute("aria-label", `Remover registro de ${formatDate(entry.date)} às ${entry.time}`);
    remove.textContent = "×";
    remove.addEventListener("click", () => {
      entries = entries.filter((itemEntry) => itemEntry.id !== entry.id);
      updatePreviewState();
      renderEntries();
    });

    item.append(content, remove);
    elements.list.append(item);
  });

  updateEntryCount();
}

function validateEntry() {
  const date = elements.date.value;
  const time = elements.time.value;
  const duration = elements.duration.value ? Number.parseInt(elements.duration.value, 10) : null;

  if (!date || !time) {
    window.alert("Preencha a data e o horário.");
    return null;
  }

  if (!selectedSide) {
    window.alert("Selecione o lado da amamentação.");
    return null;
  }

  if (duration !== null && (!Number.isFinite(duration) || duration < 1 || duration > 120)) {
    window.alert("Informe um tempo entre 1 e 120 minutos.");
    return null;
  }

  return {
    id: makeId(),
    date,
    time,
    side: selectedSide,
    duration,
    pee: elements.pee.checked,
    poop: elements.poop.checked,
    notes: elements.notes.value.trim(),
  };
}

function resetFormAfterEntry() {
  elements.duration.value = "";
  elements.pee.checked = false;
  elements.poop.checked = false;
  elements.notes.value = "";
  elements.date.value = localDateValue();
  elements.time.value = localTimeValue();
}

function wrapText(context, text, maxWidth) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";

  words.forEach((word) => {
    const test = current ? `${current} ${word}` : word;

    if (context.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
      return;
    }

    if (context.measureText(word).width > maxWidth) {
      if (current) {
        lines.push(current);
      }
      let chunk = "";
      [...word].forEach((char) => {
        if (context.measureText(`${chunk}${char}`).width > maxWidth && chunk) {
          lines.push(chunk);
          chunk = char;
        } else {
          chunk += char;
        }
      });
      current = chunk;
      return;
    }

    current = test;
  });

  if (current) {
    lines.push(current);
  }

  return lines;
}

function roundRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

function drawWrappedLine(context, text, x, y, maxWidth, lineHeight) {
  const lines = wrapText(context, text, maxWidth);
  lines.forEach((line, index) => {
    context.fillText(line, x, y + index * lineHeight);
  });
  return lines.length * lineHeight;
}

function measureDiaryRows(context, width, items) {
  const margin = 64;
  const innerWidth = width - margin * 2;
  const textColumnWidth = innerWidth - 280;

  return items.map((entry) => {
    context.font = '30px "Tenor Sans", sans-serif';
    const mainLines = wrapText(context, buildEntryDescription(entry), textColumnWidth);
    context.font = '26px "Tenor Sans", sans-serif';
    const noteLines = entry.notes ? wrapText(context, entry.notes, textColumnWidth) : [];
    const height = Math.max(92, 44 + mainLines.length * 36 + noteLines.length * 34);
    return { entry, mainLines, noteLines, height };
  });
}

function drawDiary(context, width, options) {
  const colors = {
    gold: "#B8860B",
    goldDark: "#745204",
    ink: "#17110D",
    muted: "#57493F",
    soft: "#FFF5F5",
    blush: "#FBEDE9",
    line: "#EADFDF",
    white: "#FFFFFF",
  };
  const margin = 64;
  const innerWidth = width - margin * 2;
  const rows = measureDiaryRows(context, width, options.items);
  const bodyHeight = rows.reduce((total, row) => total + row.height, 0);
  const height = Math.max(720, 382 + bodyHeight + 132);

  context.canvas.width = width;
  context.canvas.height = height;

  context.fillStyle = colors.soft;
  context.fillRect(0, 0, width, height);
  context.fillStyle = colors.gold;
  context.fillRect(0, 0, width, 10);

  if (options.monogram) {
    const markWidth = 84;
    const markHeight = markWidth * (options.monogram.height / options.monogram.width);
    context.drawImage(options.monogram, width / 2 - markWidth / 2, 42, markWidth, markHeight);
  }

  context.textAlign = "center";
  context.fillStyle = colors.goldDark;
  context.font = '24px "Tenor Sans", sans-serif';
  context.fillText("E N F .  P A U L A  F E I T O S A", width / 2, 178);

  context.fillStyle = colors.ink;
  context.font = '52px "Tenor Sans", sans-serif';
  drawWrappedLine(context, "Diário de Acompanhamento", width / 2, 236, innerWidth, 56);

  context.fillStyle = colors.muted;
  context.font = '28px "Tenor Sans", sans-serif';
  drawWrappedLine(context, [options.name, options.period].filter(Boolean).join("  ·  "), width / 2, 292, innerWidth, 36);

  context.strokeStyle = colors.gold;
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(width / 2 - 70, 322);
  context.lineTo(width / 2 + 70, 322);
  context.stroke();

  let y = 358;
  context.textAlign = "left";

  rows.forEach((row, index) => {
    if (index % 2 === 0) {
      context.fillStyle = colors.white;
      roundRect(context, margin - 18, y - 6, innerWidth + 36, row.height - 8, 14);
      context.fill();
    }

    context.fillStyle = colors.goldDark;
    context.font = '30px "Tenor Sans", sans-serif';
    context.fillText(`${formatDate(row.entry.date)}  ·  ${row.entry.time}`, margin, y + 42);

    context.fillStyle = colors.ink;
    context.font = '30px "Tenor Sans", sans-serif';
    row.mainLines.forEach((line, lineIndex) => {
      context.fillText(line, margin + 280, y + 42 + lineIndex * 36);
    });

    if (row.noteLines.length) {
      context.fillStyle = colors.muted;
      context.font = '26px "Tenor Sans", sans-serif';
      const noteStart = y + 44 + row.mainLines.length * 36;
      row.noteLines.forEach((line, lineIndex) => {
        context.fillText(line, margin + 280, noteStart + lineIndex * 34);
      });
    }

    y += row.height;
  });

  context.fillStyle = colors.ink;
  context.fillRect(0, height - 96, width, 96);
  context.textAlign = "center";
  context.fillStyle = colors.blush;
  context.font = '24px "Tenor Sans", sans-serif';
  context.fillText("Enf. Paula Feitosa · COREN-CE 1005356-ENF · paulafeitosa.enf.br", width / 2, height - 40);
}

function loadImage(src) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

function canvasToBlob(canvas) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}

function openModal() {
  lastFocusedElement = document.activeElement;
  elements.modal.hidden = false;
  document.body.classList.add("modal-open");
  elements.share.focus();
}

function closeModal() {
  if (elements.modal.hidden) {
    return;
  }

  elements.modal.hidden = true;
  document.body.classList.remove("modal-open");

  if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
    lastFocusedElement.focus();
  }
}

async function generateImage(triggerButton) {
  if (!entries.length) {
    return;
  }

  if (triggerButton) {
    triggerButton.disabled = true;
    triggerButton.textContent = "Gerando imagem...";
  }

  try {
    if (document.fonts) {
      await document.fonts.load('30px "Tenor Sans"');
      await document.fonts.ready;
    }

    const monogram = await loadImage(MONOGRAM_PATH);
    const items = sortedEntries();
    const dates = [...new Set(items.map((entry) => entry.date))];
    const period =
      dates.length > 1
        ? `${formatFullDate(dates[0])} a ${formatFullDate(dates[dates.length - 1])}`
        : formatFullDate(dates[0]);

    const context = elements.canvas.getContext("2d");
    drawDiary(context, 1080, {
      name: elements.imageName.value.trim(),
      period,
      items,
      monogram,
    });

    const blob = await canvasToBlob(elements.canvas);

    if (!blob) {
      throw new Error("Não foi possível gerar a imagem.");
    }

    updatePreviewState();
    currentBlob = blob;
    currentObjectUrl = URL.createObjectURL(blob);
    elements.modalImage.src = currentObjectUrl;
    openModal();
  } catch {
    window.alert("Não foi possível gerar a imagem agora. Tente novamente.");
  } finally {
    if (triggerButton) {
      triggerButton.textContent = "Enviar registro";
      triggerButton.disabled = false;
    }
  }
}

function downloadImage() {
  if (!currentBlob) {
    return;
  }

  const link = document.createElement("a");
  link.href = URL.createObjectURL(currentBlob);
  link.download = "diario-de-acompanhamento.png";
  link.hidden = true;
  document.body.appendChild(link);
  link.click();
  window.setTimeout(() => {
    URL.revokeObjectURL(link.href);
    link.remove();
  }, 1000);
}

async function shareImage() {
  if (!currentBlob) {
    return;
  }

  const file = new File([currentBlob], "diario-de-acompanhamento.png", { type: "image/png" });
  const title = "Diário de Acompanhamento";
  const text = "Olá, Paula! Segue o meu diário de acompanhamento.";

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title, text });
      return;
    } catch (error) {
      if (error && error.name === "AbortError") {
        return;
      }
    }
  }

  if (navigator.share) {
    try {
      await navigator.share({ title, text });
      return;
    } catch (error) {
      if (error && error.name === "AbortError") {
        return;
      }
    }
  }

  downloadImage();
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`${text} Imagem em anexo.`)}`, "_blank", "noopener,noreferrer");
}

document.querySelectorAll(".side-option").forEach((button) => {
  button.addEventListener("click", () => {
    setSelectedSide(button.dataset.side || "");
  });
});

document.querySelectorAll("[data-minutes]").forEach((button) => {
  button.addEventListener("click", () => {
    elements.duration.value = button.dataset.minutes || "";
  });
});

elements.add.addEventListener("click", async () => {
  const entry = validateEntry();

  if (!entry) {
    return;
  }

  entries.push(entry);
  updatePreviewState();
  renderEntries();
  resetFormAfterEntry();
  await generateImage(elements.add);
});

elements.clear.addEventListener("click", () => {
  const shouldClear = window.confirm("Deseja apagar todos os registros deste diário?");

  if (!shouldClear) {
    return;
  }

  entries = [];
  updatePreviewState();
  renderEntries();
});

elements.modalClose.addEventListener("click", closeModal);
elements.modal.addEventListener("click", (event) => {
  if (event.target === elements.modal) {
    closeModal();
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeModal();
  }
});
elements.download.addEventListener("click", downloadImage);
elements.share.addEventListener("click", shareImage);

elements.date.value = localDateValue();
elements.time.value = localTimeValue();
renderEntries();
