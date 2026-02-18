'use client';

import { Alert, Button, Card, InputField, Skeleton } from '@/src/components/ui';
import { useFolderManager } from './useFolderManager';
import { formatDate, formatSize } from './utils';
import styles from './FolderManager.module.css';

export function FolderManager() {
  const manager = useFolderManager();

  return (
    <Card className={styles.root}>
      <div className={styles.header}>
        <h2>Minhas pastas e arquivos</h2>
        <div className="cluster">
          <input
            ref={manager.fileInputRef}
            type="file"
            onChange={manager.handleFileInputChange}
            disabled={manager.uploading}
            className="hidden"
            aria-hidden
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              manager.clearUploadError();
              manager.fileInputRef.current?.click();
            }}
            loading={manager.uploading}
          >
            {manager.uploading ? 'Enviando arquivo...' : 'Enviar arquivo'}
          </Button>
          <Button type="button" onClick={manager.openCreateFolder}>
            Nova pasta
          </Button>
        </div>
      </div>

      <nav className={styles.breadcrumb} aria-label="Navegação por pastas">
        {manager.breadcrumb.map((item, index) => (
          <span key={item.id ?? 'root'}>
            {index > 0 ? ' / ' : null}
            {index === manager.breadcrumb.length - 1 ? (
              <span className={styles.crumbCurrent}>{item.name}</span>
            ) : (
              <button
                type="button"
                className={styles.crumbButton}
                onClick={() => manager.handleBreadcrumbClick(item)}
              >
                {item.name}
              </button>
            )}
          </span>
        ))}
      </nav>

      {!manager.isRoot ? (
        <Button type="button" variant="ghost" onClick={manager.handleBack}>
          Voltar
        </Button>
      ) : null}

      {manager.showNewFolder ? (
        <form onSubmit={manager.handleCreateFolder} className={`surface-muted ${styles.newFolderForm}`}>
          <div className="stack">
            <InputField
              id="new-folder-name"
              label="Nome da pasta"
              value={manager.newFolderName}
              onChange={(e) => manager.setNewFolderName(e.target.value)}
              placeholder="Ex: documentos, trabalho, estudos"
              disabled={manager.creating}
              autoFocus
            />
            {manager.createError ? <Alert variant="error">{manager.createError}</Alert> : null}
            <div className="cluster">
              <Button type="submit" loading={manager.creating}>
                {manager.creating ? 'Criando pasta...' : 'Criar pasta'}
              </Button>
              <Button type="button" variant="secondary" onClick={manager.closeCreateFolder}>
                Cancelar
              </Button>
            </div>
          </div>
        </form>
      ) : null}

      <div className="stack">
        {manager.error ? <Alert variant="error">{manager.error}</Alert> : null}
        {manager.uploadError ? <Alert variant="error">{manager.uploadError}</Alert> : null}
      </div>

      {manager.loading ? (
        <div className="stack" style={{ marginTop: 'var(--space-4)' }}>
          <Skeleton height="2.8rem" />
          <Skeleton height="2.8rem" />
          <Skeleton height="2.8rem" />
        </div>
      ) : (
        <div
          className={`${styles.dropArea} ${manager.isDragging ? styles.dragging : ''}`}
          onDrop={manager.handleDrop}
          onDragOver={manager.handleDragOver}
          onDragLeave={manager.handleDragLeave}
        >
          {manager.isDragging ? <Alert>Solte o arquivo aqui para enviar.</Alert> : null}

          {manager.folders.length === 0 && manager.files.length === 0 && !manager.error ? (
            <p className={styles.emptyState}>
              Pasta vazia. Crie uma nova pasta ou envie um arquivo para começar.
            </p>
          ) : (
            <div className="stack-lg">
              {manager.folders.length > 0 ? (
                <ul className={styles.entryList}>
                  {manager.folders.map((folder) => (
                    <li key={folder.id} className={styles.entry}>
                      <strong title={folder.name}>Pasta: {folder.name}</strong>
                      <Button type="button" onClick={() => manager.handleEnterFolder(folder)}>
                        Abrir
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : null}

              <div className="stack">
                <h3>Arquivos</h3>
                {manager.files.length === 0 ? (
                  <p className="text-muted">Nenhum arquivo nesta pasta.</p>
                ) : (
                  <ul className={styles.entryList}>
                    {manager.files.map((file) => (
                      <li key={file.id} className={styles.entry}>
                        <div className="stack" style={{ gap: 'var(--space-1)' }}>
                          <strong title={file.name}>Arquivo: {file.name}</strong>
                          <span className={styles.entryMeta}>
                            {formatSize(file.size)} · {formatDate(file.createdAt)}
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => manager.handleDownload(file)}
                          loading={manager.downloadingId === file.id}
                        >
                          {manager.downloadingId === file.id ? 'Baixando...' : 'Download'}
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
