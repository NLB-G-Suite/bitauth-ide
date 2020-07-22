import React from 'react';
import './ProjectExplorer.scss';
import { connect } from 'react-redux';
import {
  AppState,
  IDETemplateUnlockingScript,
  IDETemplateScript,
  IDETemplateTestSetupScript,
  IDEActivatableScript,
  ScriptType,
} from '../../state/types';
import { ActionCreators } from '../../state/reducer';
import { Icon } from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import { unknownValue } from '../../utils';
import { wrapInterfaceTooltip } from '../common';

interface ProjectExplorerTreeNode {
  active: boolean;
  name: string;
  id: string;
  internalId: string;
  activatable: boolean;
  type: ScriptType;
}

interface ProjectExplorerTreeParent extends ProjectExplorerTreeNode {
  children?: ProjectExplorerTreeNode[];
}

const isActivatable = (
  script: IDETemplateScript
): script is IDEActivatableScript =>
  script.type === 'unlocking' ||
  script.type === 'isolated' ||
  script.type === 'test-setup';

const hasParentId = (
  script: IDETemplateScript
): script is IDETemplateUnlockingScript | IDETemplateTestSetupScript =>
  (script as IDETemplateUnlockingScript | IDETemplateTestSetupScript)
    .parentInternalId !== undefined;

const getActiveParent = (script: IDETemplateScript) =>
  hasParentId(script) ? script.parentInternalId : undefined;

const buildProjectExplorerTree = (
  state: AppState
): ProjectExplorerTreeParent[] => {
  const activeInternalId =
    state.currentEditingMode === 'script'
      ? state.currentlyEditingInternalId
      : undefined;
  const activeParentInternalId = activeInternalId
    ? getActiveParent(
        state.currentTemplate.scriptsByInternalId[activeInternalId]
      )
    : undefined;
  return Object.entries(state.currentTemplate.scriptsByInternalId)
    .reduce<ProjectExplorerTreeNode[]>(
      (parents, [internalId, script]) =>
        script.type === 'locking' || script.type === 'tested'
          ? [
              ...parents,
              {
                active:
                  activeInternalId !== undefined &&
                  (activeInternalId === internalId ||
                    activeParentInternalId === internalId),
                id: script.id,
                internalId,
                name: script.name,
                activatable: false,
                type: script.type,
                ...(script.childInternalIds && {
                  children: script.childInternalIds
                    .map((childInternalId) => ({
                      activatable: true,
                      active:
                        activeInternalId !== undefined &&
                        activeInternalId === childInternalId,
                      id:
                        state.currentTemplate.scriptsByInternalId[
                          childInternalId
                        ].id,
                      internalId: childInternalId,
                      name:
                        state.currentTemplate.scriptsByInternalId[
                          childInternalId
                        ].name,
                      type:
                        state.currentTemplate.scriptsByInternalId[
                          childInternalId
                        ].type,
                    }))
                    .sort((a, b) => a.name.localeCompare(b.name)),
                }),
              },
            ]
          : script.type === 'isolated'
          ? [
              ...parents,
              {
                active: activeInternalId === internalId,
                id: script.id,
                internalId,
                name: script.name,
                activatable: isActivatable(script),
                type: script.type,
              },
            ]
          : parents,
      []
    )
    .sort((a, b) => a.name.localeCompare(b.name));
};

const size = 10;
const getIcon = (type?: ScriptType) => {
  switch (type) {
    case undefined:
      return undefined;
    case 'isolated':
      return (
        <Icon className="icon" icon={IconNames.DOCUMENT} iconSize={size} />
      );
    case 'tested':
      return <Icon className="icon" icon={IconNames.SAVED} iconSize={size} />;
    case 'locking':
      return <Icon className="icon" icon={IconNames.LOCK} iconSize={size} />;
    case 'unlocking':
      return <Icon className="icon" icon={IconNames.KEY} iconSize={size} />;
    case 'test-setup':
    case 'test-check':
      return <Icon className="icon" icon={IconNames.CONFIRM} iconSize={size} />;
    default:
      return unknownValue(type);
  }
};

const getScriptTypeName = (type?: ScriptType) => {
  switch (type) {
    case undefined:
      return undefined;
    case 'isolated':
      return 'Isolated Script';
    case 'tested':
      return 'Tested Script';
    case 'locking':
      return 'Locking Script';
    case 'unlocking':
      return 'Unlocking Script';
    case 'test-setup':
      return 'Test Setup Script';
    case 'test-check':
      return 'Test Checking Script';
    default:
      return unknownValue(type);
  }
};

export const getScriptTooltipIcon = (type?: ScriptType) =>
  wrapInterfaceTooltip(getIcon(type), getScriptTypeName(type));

export const ProjectExplorer = connect(
  (state: AppState) => ({
    templateName: state.currentTemplate.name,
    currentEditingMode: state.currentEditingMode,
    currentlyEditingId: state.currentlyEditingInternalId,
    entities: Object.keys(state.currentTemplate.entitiesByInternalId).map(
      (internalId) => ({
        internalId,
        name: state.currentTemplate.entitiesByInternalId[internalId].name,
      })
    ),
    scripts: buildProjectExplorerTree(state),
  }),
  {
    openTemplateSettings: ActionCreators.openTemplateSettings,
    activateEntity: ActionCreators.activateEntity,
    activateScript: ActionCreators.activateScript,
    changeTemplate: ActionCreators.importTemplate,
    newEntity: ActionCreators.newEntity,
    newScript: ActionCreators.newScript,
    importScript: ActionCreators.importScript,
  }
)(
  ({
    currentEditingMode,
    currentlyEditingId,
    templateName,
    entities,
    scripts,
    openTemplateSettings,
    activateEntity,
    activateScript,
    changeTemplate,
    newEntity,
    newScript,
    importScript,
  }: {
    currentEditingMode: AppState['currentEditingMode'];
    currentlyEditingId: AppState['currentlyEditingInternalId'];
    templateName: string;
    entities: { internalId: string; name: string }[];
    scripts: ProjectExplorerTreeParent[];
    openTemplateSettings: typeof ActionCreators.openTemplateSettings;
    activateEntity: typeof ActionCreators.activateEntity;
    activateScript: typeof ActionCreators.activateScript;
    changeTemplate: typeof ActionCreators.importTemplate;
    newEntity: typeof ActionCreators.newEntity;
    newScript: typeof ActionCreators.newScript;
    importScript: typeof ActionCreators.importScript;
  }) => {
    return (
      <div className="ProjectExplorer">
        <button
          className={`no-button-style${
            currentEditingMode === 'template-settings' ? ' active' : ''
          }`}
          onClick={() => openTemplateSettings()}
        >
          <h1 className="title-area">
            <span className="title">{templateName}</span>
            {currentEditingMode !== 'template-settings' && (
              <div className="settings-button">
                {wrapInterfaceTooltip(
                  <Icon icon={IconNames.COG} iconSize={10} />,
                  'Authentication Template Settings'
                )}
              </div>
            )}
          </h1>
        </button>
        <div className="entities-section">
          <h3>
            Entities
            <button className="add-button" onClick={() => newEntity()}>
              {wrapInterfaceTooltip(
                <Icon icon={IconNames.PLUS} iconSize={12} />,
                'New Entity...'
              )}
            </button>
          </h3>
          <ul className="entities">
            {entities.map((entity) => (
              <button
                className={`no-button-style ${
                  currentEditingMode === 'entity' &&
                  currentlyEditingId === entity.internalId
                    ? 'activatable active'
                    : 'activatable'
                }`}
                key={entity.internalId}
                onClick={() => activateEntity(entity.internalId)}
              >
                <li>{entity.name}</li>
              </button>
            ))}
          </ul>
        </div>
        <div className="script-section">
          <h3>
            Scripts
            <button className="add-button" onClick={() => newScript()}>
              {wrapInterfaceTooltip(
                <Icon icon={IconNames.PLUS} iconSize={12} />,
                'New Script...'
              )}
            </button>
            <button className="add-button" onClick={() => importScript()}>
              {wrapInterfaceTooltip(
                <Icon icon={IconNames.IMPORT} iconSize={12} />,
                'Import Script...'
              )}
            </button>
          </h3>
          <ul className="scripts">
            {scripts.map((node) => {
              const child = (
                <li title={`Script ID: ${node.id}`}>
                  {getScriptTooltipIcon(node.type)}
                  {node.name}
                  {node.children !== undefined && (
                    <ul>
                      {node.children.map((child) => (
                        <button
                          className={`no-button-style ${
                            child.active ? 'active' : ''
                          } ${child.activatable ? 'activatable' : ''}`}
                          key={child.internalId}
                          onClick={(e) => {
                            e.stopPropagation();
                            return child.activatable
                              ? activateScript(child.internalId)
                              : undefined;
                          }}
                        >
                          <li title={`Script ID: ${child.id}`}>
                            {getScriptTooltipIcon(child.type)}
                            {child.name}
                          </li>
                        </button>
                      ))}
                    </ul>
                  )}
                </li>
              );

              const parentClassName = `no-button-style ${
                node.active ? 'active' : ''
              } ${node.activatable ? 'activatable' : ''}`;

              const handleParentClick = () =>
                node.activatable
                  ? activateScript(node.internalId)
                  : node.children !== undefined
                  ? activateScript(node.children[0].internalId)
                  : undefined;

              return node.children !== undefined ? (
                <div
                  className={parentClassName}
                  onClick={handleParentClick}
                  key={node.internalId}
                >
                  {child}
                </div>
              ) : (
                <button
                  className={parentClassName}
                  onClick={handleParentClick}
                  key={node.internalId}
                >
                  {child}
                </button>
              );
            })}
          </ul>
        </div>
      </div>
    );
  }
);
